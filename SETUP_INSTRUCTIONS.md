# ChartBot SQL - Setup Instructions

## Prerequisites

1. **PostgreSQL** - Make sure PostgreSQL is installed and running
2. **Python 3.8+** - For the Flask backend
3. **Node.js 16+** - For the Angular frontend

## Step 1: PostgreSQL Setup

### Install PostgreSQL (if not already installed)

**Windows:**
```bash
# Download from https://www.postgresql.org/download/windows/
# Or use Chocolatey:
choco install postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Configure PostgreSQL

1. **Set password for postgres user:**
```bash
sudo -u postgres psql
ALTER USER postgres PASSWORD 'post27';
\q
```

2. **Verify PostgreSQL is running:**
```bash
psql -U postgres -h localhost -p 5432
# Enter password: post27
```

## Step 2: Backend Setup

1. **Navigate to project directory:**
```bash
cd chartbot-sql
```

2. **Install Python dependencies:**
```bash
pip install -r requirements.txt
```

3. **Start the backend (everything is handled automatically):**
```bash
python app.py
```

This single command will:
- ✅ Create the database if it doesn't exist
- ✅ Create sample data tables
- ✅ Initialize Flask database tables
- ✅ Start the Flask server on http://localhost:5000

4. **Verify backend is running:**
- Open http://localhost:5000/api/health in your browser
- You should see: `{"status": "healthy", "database": "connected"}`

## Step 3: Frontend Setup

1. **Install Node.js dependencies:**
```bash
npm install
```

2. **Start the Angular development server:**
```bash
ng serve
```

3. **Open the application:**
- Navigate to http://localhost:4200
- The frontend should now connect to the backend

## Step 4: Testing the Connection

### Test SQL Queries

Once both servers are running, try these SQL queries in the chat:

1. **Basic query:**
```sql
SELECT * FROM sales_table LIMIT 5
```

2. **Group by category:**
```sql
SELECT category, SUM(amount) as total FROM sales_table GROUP BY category
```

3. **Monthly analysis:**
```sql
SELECT month, COUNT(*) as count FROM sales_table GROUP BY month
```

## Troubleshooting

### Backend Connection Issues

1. **PostgreSQL not running:**
```bash
# Windows
net start postgresql-x64-15

# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

2. **Database connection failed:**
- Check if PostgreSQL is running on port 5432
- Verify username: `postgres`, password: `post27`
- Test connection: `psql -U postgres -h localhost -p 5432`

3. **Port 5000 already in use:**
```bash
# Find process using port 5000
lsof -i :5000
# Kill the process
kill -9 <PID>
```

### Frontend Connection Issues

1. **CORS errors:**
- Make sure the backend is running on http://localhost:5000
- Check that CORS is enabled in app.py

2. **API endpoint not found:**
- Verify the backend is running
- Check the API URL in `src/app/services/chat.service.ts`

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/chat` - Send SQL query
- `POST /api/create-chart` - Create chart visualization
- `GET /api/chats` - List all chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/<id>/history` - Get chat history

## Sample Data

The app.py automatically creates a `sales_table` with sample data:

| product_name | category | amount | month | year |
|--------------|----------|--------|-------|------|
| Laptop | Electronics | 1200.00 | January | 2024 |
| Mouse | Electronics | 25.00 | January | 2024 |
| Desk | Furniture | 300.00 | January | 2024 |
| ... | ... | ... | ... | ... |

## Development

### Backend Development
```bash
# Start with auto-reload (everything included)
python app.py
```

### Frontend Development
```bash
# Start Angular dev server
ng serve

# Build for production
ng build --prod
```

## Production Deployment

1. **Backend:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Frontend:**
```bash
ng build --prod
# Serve the dist/ folder with a web server
```

## Support

If you encounter issues:

1. Check the browser console for frontend errors
2. Check the Flask server logs for backend errors
3. Verify PostgreSQL connection with `psql -U postgres -h localhost`
4. Test the health endpoint: http://localhost:5000/api/health

## File Structure

```
chartbot-sql/
├── app.py              # Main Flask backend (everything included)
├── models.py           # Database models
├── requirements.txt    # Python dependencies
├── package.json        # Node.js dependencies
└── src/               # Angular frontend
```

**That's it!** Just two main Python files handle everything:
- `app.py` - Complete backend with database setup
- `models.py` - Database models 