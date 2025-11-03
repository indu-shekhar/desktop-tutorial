from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .config import Config

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__, template_folder="../templates")
    app.config.from_object(Config)
    CORS(app)
    db.init_app(app)
    jwt.init_app(app)

    # Register blueprints
    from .auth import auth_bp
    from .intent import intent_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(intent_bp)

    return app
