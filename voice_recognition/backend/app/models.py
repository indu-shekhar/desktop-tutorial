from flask_sqlalchemy import SQLAlchemy
from . import db

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    user_id = db.Column(db.String(120), nullable=False)
    balance = db.Column(db.Float, nullable=False)
    audio_file = db.Column(db.LargeBinary, nullable=False)
    face_encoding = db.Column(db.PickleType, nullable=False)

    def __init__(self, email, user_id, audio_file, face_encoding):
        self.email = email
        self.user_id = user_id
        self.audio_file = audio_file
        self.face_encoding = face_encoding
        self.balance = 10000.0

class TransactionHistory(db.Model):
    transaction_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    acc_email = db.Column(db.String(120), db.ForeignKey("user.email"), nullable=False)
    sent_to_email = db.Column(db.String(120), nullable=True)
    transaction_type = db.Column(db.String(50), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, server_default=db.func.now())
