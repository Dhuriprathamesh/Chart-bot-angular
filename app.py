from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import plotly
import numpy as np
import re
import os
import json
import time
from datetime import datetime
from models import db, Chat

# --- PostgreSQL ---
import psycopg2
from psycopg2.extras import RealDictCursor
import psycopg2.pool

app = Flask(__name__)
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:post27@localhost:5432/chartbot_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

@app.route('/')
def index():
    return render_template('index.html')

# Create connection pool for better performance with big data
connection_pool = psycopg2.pool.ThreadedConnectionPool(
    1, 20,  # min and max connections
    dbname="chartbot_db",
    user="postgres", 
    password="post27",
    host="localhost",
    port="5432"
)

def setup_database():
    """Setup database and create sample data"""
    try:
        # Connect to default postgres database first
        conn = psycopg2.connect(
            dbname="postgres",
            user="postgres", 
            password="post27",
            host="localhost",
            port="5432"
        )
        conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        
        # Check if our database exists
        cur.execute("SELECT 1 FROM pg_database WHERE datname='chartbot_db'")
        exists = cur.fetchone()
        
        if not exists:
            print("Creating database 'chartbot_db'...")
            cur.execute("CREATE DATABASE chartbot_db")
            print("SUCCESS: Database 'chartbot_db' created successfully!")
        else:
            print("SUCCESS: Database 'chartbot_db' already exists!")
        
        cur.close()
        conn.close()
        
        # Now connect to our database and create sample data
        conn = psycopg2.connect(
            dbname="chartbot_db",
            user="postgres", 
            password="post27",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        
        # Create sample sales table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sales_table (
                id SERIAL PRIMARY KEY,
                product_name VARCHAR(100),
                category VARCHAR(50),
                amount DECIMAL(10,2),
                month VARCHAR(20),
                year INTEGER
            )
        """)
        
        # Insert sample data
        sample_data = [
            ('Laptop', 'Electronics', 1200.00, 'January', 2024),
            ('Mouse', 'Electronics', 25.00, 'January', 2024),
            ('Desk', 'Furniture', 300.00, 'January', 2024),
            ('Laptop', 'Electronics', 1200.00, 'February', 2024),
            ('Keyboard', 'Electronics', 80.00, 'February', 2024),
            ('Chair', 'Furniture', 150.00, 'February', 2024),
            ('Monitor', 'Electronics', 400.00, 'March', 2024),
            ('Table', 'Furniture', 200.00, 'March', 2024),
            ('Headphones', 'Electronics', 120.00, 'March', 2024),
            ('Bookshelf', 'Furniture', 180.00, 'March', 2024)
        ]
        
        # Clear existing data and insert new
        cur.execute("DELETE FROM sales_table")
        cur.executemany("""
            INSERT INTO sales_table (product_name, category, amount, month, year)
            VALUES (%s, %s, %s, %s, %s)
        """, sample_data)
        
        conn.commit()
        print("SUCCESS: Sample data created successfully!")
        print("You can now test with queries like:")
        print("   SELECT * FROM sales_table LIMIT 5")
        print("   SELECT category, SUM(amount) as total FROM sales_table GROUP BY category")
        print("   SELECT month, COUNT(*) as count FROM sales_table GROUP BY month")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"ERROR: Database setup failed: {e}")
        print("\nPlease check:")
        print("1. PostgreSQL is running on localhost:5432")
        print("2. Username: postgres, Password: post27")
        print("3. PostgreSQL service is started")
        return False

# --- PostgreSQL Helper ---
def get_data_from_postgres(query):
    try:
        conn = connection_pool.getconn()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Execute the query as-is without automatic LIMIT addition
        cur.execute(query)
        rows = cur.fetchall()
        
        # Convert RealDictRow to regular dict
        result = []
        for row in rows:
            result.append(dict(row))
        
        cur.close()
        connection_pool.putconn(conn)
        return result
    except Exception as e:
        print(f"PostgreSQL error: {e}")
        return None

# --- SQL Query Detection ---
def is_sql_query(message):
    """Check if the message is a SQL query"""
    sql_keywords = ['select', 'insert', 'update', 'delete', 'create', 'drop', 'alter', 'show', 'describe']
    message_lower = message.lower().strip()
    return any(message_lower.startswith(keyword) for keyword in sql_keywords)

# --- Data Analysis for Chart Creation ---
def analyze_data_for_chart(data, chart_type):
    """Analyze data structure and create appropriate chart data"""
    if not data or len(data) == 0:
        return None
    
    first_row = data[0]
    columns = list(first_row.keys())
    
    # Find the best columns for visualization
    label_candidates = ['name', 'category', 'label', 'title', 'product', 'region', 'month', 'year', 'date']
    value_candidates = ['value', 'amount', 'count', 'total', 'sum', 'price', 'sales', 'revenue', 'quantity']
    
    # Find label column
    label_column = None
    for col in columns:
        if any(candidate in col.lower() for candidate in label_candidates):
            label_column = col
            break
    
    if not label_column:
        label_column = columns[0]
    
    # Find value column (numeric)
    value_column = None
    for col in columns:
        if col == label_column:
            continue
        # Check if column contains numeric data
        try:
            sample_value = first_row[col]
            if isinstance(sample_value, (int, float)) or (isinstance(sample_value, str) and sample_value.replace('.', '').replace('-', '').isdigit()):
                value_column = col
                break
        except:
            continue
    
    if not value_column:
        # If no numeric column found, use the second column or first if only one column
        value_column = columns[1] if len(columns) > 1 else columns[0]
    
    # Extract labels and values
    labels = []
    values = []
    
    for row in data:
        label = str(row.get(label_column, ''))
        try:
            value = float(row.get(value_column, 0))
        except (ValueError, TypeError):
            value = 0
        
        labels.append(label)
        values.append(value)
    
    # Generate colors
    colors = generate_colors(chart_type, len(values))
    
    # Create title
    title = f"{chart_type.title()} Chart: {value_column} by {label_column}"
    
    return {
        "type": chart_type,
        "labels": labels,
        "values": values,
        "colors": colors,
        "title": title
    }

def generate_colors(chart_type, count):
    """Generate appropriate colors for chart"""
    base_colors = [
        "#6366f1", "#8b5cf6", "#a855f7", "#c084fc", "#e879f9",
        "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#84cc16"
    ]
    
    if chart_type in ['line', 'area']:
        return [base_colors[0]]
    
    colors = []
    for i in range(count):
        colors.append(base_colors[i % len(base_colors)])
    
    return colors

def analyze_data_for_chart_suggestions(data):
    """Analyze data and suggest appropriate chart types"""
    if not data or len(data) == 0:
        return []
    
    first_row = data[0]
    columns = list(first_row.keys())
    
    # Find numeric and categorical columns
    numeric_columns = []
    categorical_columns = []
    
    for col in columns:
        try:
            sample_value = first_row[col]
            if isinstance(sample_value, (int, float)) or (isinstance(sample_value, str) and sample_value.replace('.', '').replace('-', '').isdigit()):
                numeric_columns.append(col)
            else:
                categorical_columns.append(col)
        except:
            categorical_columns.append(col)
    
    suggestions = []
    
    # 1. Bar Chart - Good for comparing categories
    if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
        suggestions.append({
            "type": "bar",
            "title": "Bar Chart",
            "description": "Compare values across different categories",
            "icon": "📊",
            "best_for": "Comparing categories with numeric values"
        })
    
    # 2. Line Chart - Good for trends over time
    if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
        suggestions.append({
            "type": "line",
            "title": "Line Chart",
            "description": "Show trends and patterns over time",
            "icon": "📈",
            "best_for": "Time series data and trends"
        })
    
    # 3. Pie Chart - Good for proportions
    if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
        suggestions.append({
            "type": "pie",
            "title": "Pie Chart",
            "description": "Show proportions and percentages",
            "icon": "🥧",
            "best_for": "Showing parts of a whole"
        })
    
    # 4. Area Chart - Good for cumulative data
    if len(categorical_columns) >= 1 and len(numeric_columns) >= 1:
        suggestions.append({
            "type": "area",
            "title": "Area Chart",
            "description": "Show cumulative data and trends",
            "icon": "📊",
            "best_for": "Cumulative values and trends"
        })
    
    # 5. Scatter Plot - Good for correlations
    if len(numeric_columns) >= 2:
        suggestions.append({
            "type": "scatter",
            "title": "Scatter Plot",
            "description": "Show relationships between two variables",
            "icon": "🔍",
            "best_for": "Finding correlations between variables"
        })
    
    # If we don't have enough data for specific charts, add general suggestions
    if len(suggestions) < 5:
        general_suggestions = [
            {
                "type": "table",
                "title": "Data Table",
                "description": "Display data in a structured table format",
                "icon": "📋",
                "best_for": "Detailed data review"
            },
            {
                "type": "summary",
                "title": "Summary Statistics",
                "description": "Show key statistics and insights",
                "icon": "📊",
                "best_for": "Quick data overview"
            }
        ]
        
        for suggestion in general_suggestions:
            if len(suggestions) < 5:
                suggestions.append(suggestion)
    
    return suggestions[:5]  # Return maximum 5 suggestions

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    message = data.get('message', '').strip()
    
    # Check if it's a SQL query
    if is_sql_query(message):
        # Basic SQL injection protection - only allow SELECT statements for safety
        message_lower = message.lower().strip()
        if not message_lower.startswith('select'):
            return jsonify({
                "success": False,
                "error": "Only SELECT queries are allowed for security reasons. Please start your query with SELECT."
            })
        
        # Execute SQL query
        query_result = get_data_from_postgres(message)
        
        if query_result is None:
            return jsonify({
                "success": False,
                "error": "Failed to execute SQL query. Please check your syntax and try again."
            })
        
        if len(query_result) == 0:
            return jsonify({
                "success": False,
                "error": "Query executed successfully but returned no data."
            })
        
        # Analyze data and suggest chart types
        chart_suggestions = analyze_data_for_chart_suggestions(query_result)
        
        # Return data with chart suggestions
        return jsonify({
            "success": True,
            "type": "sql_result",
            "data": query_result,
            "message": f"Great! I found {len(query_result)} records from your query. Please choose how you'd like to visualize this data:",
            "query": message,
            "chart_suggestions": chart_suggestions
        })
    
    else:
        # Handle regular chat - provide helpful SQL examples
        return jsonify({
            "success": True,
            "type": "chat_response",
            "message": "Please enter a SQL query to fetch data from your PostgreSQL database. Here are some examples:\n\n• SELECT * FROM sales_table LIMIT 10\n• SELECT category, SUM(amount) as total FROM sales_table GROUP BY category\n• SELECT month, COUNT(*) as count FROM orders GROUP BY month\n\nI'll help you create beautiful visualizations once you provide the data!"
        })

@app.route('/api/create-chart', methods=['POST'])
def create_chart():
    data = request.get_json()
    chart_type = data.get('chartType', 'bar')
    sql_data = data.get('data', [])
    sql_query = data.get('query', '')
    
    if not sql_data:
        return jsonify({
            "success": False,
            "error": "No data provided for chart creation"
        })
    
    # Analyze data and create chart
    chart_data = analyze_data_for_chart(sql_data, chart_type)
    
    if not chart_data:
        return jsonify({
            "success": False,
            "error": "Could not analyze data for chart creation"
        })
    
    # Add SQL query to chart data for reference
    chart_data["sqlQuery"] = sql_query
    
    # Generate chart visualization data
    visualization_data = generate_chart_visualization(chart_data, chart_type)
    
    return jsonify({
        "success": True,
        "chart": chart_data,
        "visualization": visualization_data,
        "message": f"Here's your {chart_type} chart visualization:"
    })

def generate_chart_visualization(chart_data, chart_type):
    """Generate visualization data for different chart types"""
    if chart_type == "bar":
        return {
            "type": "bar",
            "data": {
                "labels": chart_data["labels"],
                "datasets": [{
                    "label": chart_data["title"],
                    "data": chart_data["values"],
                    "backgroundColor": chart_data["colors"],
                    "borderColor": chart_data["colors"],
                    "borderWidth": 1
                }]
            },
            "options": {
                "responsive": True,
                "scales": {
                    "y": {"beginAtZero": True}
                }
            }
        }
    
    elif chart_type == "line":
        return {
            "type": "line",
            "data": {
                "labels": chart_data["labels"],
                "datasets": [{
                    "label": chart_data["title"],
                    "data": chart_data["values"],
                    "borderColor": chart_data["colors"][0],
                    "backgroundColor": chart_data["colors"][0] + "20",
                    "tension": 0.1
                }]
            },
            "options": {
                "responsive": True,
                "scales": {
                    "y": {"beginAtZero": True}
                }
            }
        }
    
    elif chart_type == "pie":
        return {
            "type": "pie",
            "data": {
                "labels": chart_data["labels"],
                "datasets": [{
                    "data": chart_data["values"],
                    "backgroundColor": chart_data["colors"],
                    "borderWidth": 2,
                    "borderColor": "#fff"
                }]
            },
            "options": {
                "responsive": True,
                "plugins": {
                    "legend": {"position": "bottom"}
                }
            }
        }
    
    elif chart_type == "area":
        return {
            "type": "line",
            "data": {
                "labels": chart_data["labels"],
                "datasets": [{
                    "label": chart_data["title"],
                    "data": chart_data["values"],
                    "borderColor": chart_data["colors"][0],
                    "backgroundColor": chart_data["colors"][0] + "40",
                    "fill": True,
                    "tension": 0.1
                }]
            },
            "options": {
                "responsive": True,
                "scales": {
                    "y": {"beginAtZero": True}
                }
            }
        }
    
    elif chart_type == "scatter":
        return {
            "type": "scatter",
            "data": {
                "datasets": [{
                    "label": chart_data["title"],
                    "data": [{"x": i, "y": val} for i, val in enumerate(chart_data["values"])],
                    "backgroundColor": chart_data["colors"][0],
                    "borderColor": chart_data["colors"][0]
                }]
            },
            "options": {
                "responsive": True,
                "scales": {
                    "x": {"type": "linear", "position": "bottom"},
                    "y": {"beginAtZero": True}
                }
            }
        }
    
    elif chart_type == "table":
        return {
            "type": "table",
            "data": {
                "headers": ["Category", "Value"],
                "rows": [[label, value] for label, value in zip(chart_data["labels"], chart_data["values"])]
            }
        }
    
    elif chart_type == "summary":
        total = sum(chart_data["values"])
        avg = total / len(chart_data["values"]) if chart_data["values"] else 0
        max_val = max(chart_data["values"]) if chart_data["values"] else 0
        min_val = min(chart_data["values"]) if chart_data["values"] else 0
        
        return {
            "type": "summary",
            "data": {
                "total": total,
                "average": round(avg, 2),
                "maximum": max_val,
                "minimum": min_val,
                "count": len(chart_data["values"]),
                "top_categories": sorted(zip(chart_data["labels"], chart_data["values"]), 
                                       key=lambda x: x[1], reverse=True)[:3]
            }
        }
    
    else:
        return {
            "type": "bar",
            "data": {
                "labels": chart_data["labels"],
                "datasets": [{
                    "label": chart_data["title"],
                    "data": chart_data["values"],
                    "backgroundColor": chart_data["colors"]
                }]
            }
        }

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        # Test database connection
        conn = connection_pool.getconn()
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        connection_pool.putconn(conn)
        
        return jsonify({
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            "status": "unhealthy", 
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }), 500

# Ensure chat_history directory exists
CHAT_HISTORY_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'chat_history')
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)

@app.route('/api/chats', methods=['POST'])
def create_chat():
    data = request.get_json()
    if not data or 'chat_name' not in data:
        return jsonify({'error': 'Chat name is required'}), 400
    try:
        new_chat = Chat(chat_name=data['chat_name'])
        db.session.add(new_chat)
        db.session.commit()
        # Create a new JSON file for this chat
        chat_history_path = os.path.join(CHAT_HISTORY_DIR, f"chat_{new_chat.id}.json")
        with open(chat_history_path, 'w', encoding='utf-8') as f:
            json.dump([], f)  # Start with an empty list
        return jsonify({
            'chat_id': new_chat.id,
            'chat_name': new_chat.chat_name,
            'created_at': new_chat.chat_data['created_at']
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<int:chat_id>/messages', methods=['POST'])
def add_message(chat_id):
    data = request.get_json()
    if not data or 'sender' not in data or 'message' not in data:
        return jsonify({'error': 'Sender and message are required'}), 400
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    try:
        user_message = data['message']
        chat.add_message(data['sender'], user_message)
        db.session.commit()

        # Generate bot response using the same logic as /api/chat
        if is_sql_query(user_message):
            message_lower = user_message.lower().strip()
            if not message_lower.startswith('select'):
                bot_response = "Only SELECT queries are allowed for security reasons. Please start your query with SELECT."
            else:
                query_result = get_data_from_postgres(user_message)
                if query_result is None:
                    bot_response = "Failed to execute SQL query. Please check your syntax and try again."
                elif len(query_result) == 0:
                    bot_response = "Query executed successfully but returned no data."
                else:
                    bot_response = f"Great! I found {len(query_result)} records from your query. Please choose how you'd like to visualize this data:"
        else:
            bot_response = "Please enter a SQL query to fetch data from your PostgreSQL database. Here are some examples:\n\n• SELECT * FROM sales_table LIMIT 10\n• SELECT category, SUM(amount) as total FROM sales_table GROUP BY category\n• SELECT month, COUNT(*) as count FROM orders GROUP BY month\n\nI'll help you create beautiful visualizations once you provide the data!"

        # Store message and response in chat history JSON file
        chat_history_path = os.path.join(CHAT_HISTORY_DIR, f"chat_{chat.id}.json")
        # Load existing history
        if os.path.exists(chat_history_path):
            with open(chat_history_path, 'r', encoding='utf-8') as f:
                history = json.load(f)
        else:
            history = []
        # Append new entry
        history.append({
            'sender': data['sender'],
            'message': user_message,
            'response': bot_response
        })
        # Save back to file
        with open(chat_history_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return jsonify({
            'status': 'Message added',
            'chat_id': chat.id,
            'updated_at': chat.chat_data['updated_at'],
            'bot_response': bot_response
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<int:chat_id>', methods=['GET'])
def get_chat(chat_id):
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    return jsonify({
        'chat_id': chat.id,
        'chat_name': chat.chat_name,
        'chat_data': chat.chat_data
    })

@app.route('/api/chats', methods=['GET'])
def list_chats():
    chats = Chat.query.order_by(Chat.id.desc()).all()
    return jsonify([{
        'chat_id': chat.id,
        'chat_name': chat.chat_name,
        'created_at': chat.chat_data['created_at'],
        'updated_at': chat.chat_data['updated_at']
    } for chat in chats])

@app.route('/api/chats/<int:chat_id>/history', methods=['GET'])
def get_chat_history(chat_id):
    chat_history_path = os.path.join(CHAT_HISTORY_DIR, f"chat_{chat_id}.json")
    if not os.path.exists(chat_history_path):
        return jsonify({'error': 'Chat history not found'}), 404
    try:
        with open(chat_history_path, 'r', encoding='utf-8') as f:
            history = json.load(f)
        return jsonify({'chat_id': chat_id, 'history': history})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chats/<int:chat_id>/save-chart', methods=['POST'])
def save_chart_to_history(chat_id):
    data = request.get_json()
    chat_history_path = os.path.join(CHAT_HISTORY_DIR, f"chat_{chat_id}.json")
    if not os.path.exists(chat_history_path):
        return jsonify({'error': 'Chat history not found'}), 404
    try:
        with open(chat_history_path, 'r', encoding='utf-8') as f:
            history = json.load(f)
        # Add chart entry
        history.append({
            'type': 'chart',
            'chart_data': data.get('chart_data', {}),
            'timestamp': datetime.now().isoformat()
        })
        with open(chat_history_path, 'w', encoding='utf-8') as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return jsonify({'status': 'Chart saved'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.cli.command('init-db')
def init_db():
    """Initialize the database."""
    db.create_all()
    print('Initialized the database.')

if __name__ == '__main__':
    print("Setting up ChartBot SQL Backend...")
    print("=" * 50)
    
    # Setup database and sample data
    if setup_database():
        print("SUCCESS: Database setup completed!")
    else:
        print("ERROR: Database setup failed!")
        exit(1)
    
    # Initialize Flask database tables
    with app.app_context():
        db.create_all()
        print("SUCCESS: Flask database tables created!")
    
    print("\nStarting Flask server on http://localhost:5000...")
    print("You can now:")
    print("   - Open http://localhost:5000 in your browser")
    print("   - Start your Angular frontend")
    print("   - Test the API endpoints")
    print("\nPress Ctrl+C to stop the server")
    
    app.run(debug=True)
