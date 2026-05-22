from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Config:
    SECRET_KEY = "secret-pos"
    SQLALCHEMY_DATABASE_URI = "sqlite:///instance/pos.db"
    SQLALCHEMY_TRACK_MODIFICATIONS = False