from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Chat(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    chat_name = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    @property
    def chat_data(self):
        return {
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }
    
    def add_message(self, sender, message):
        """Add a message to the chat"""
        # This method is called by the backend to track message additions
        self.updated_at = datetime.utcnow()
    
    def to_dict(self):
        return {
            'id': self.id,
            'chat_name': self.chat_name,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        } 