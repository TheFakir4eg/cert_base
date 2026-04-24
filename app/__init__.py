# /app/__init__.py

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from dotenv import load_dotenv
from .config import Config
import os

load_dotenv() # Загружаем переменные из .env

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager() # Создаём экземпляр LoginManager

@login_manager.user_loader
def load_user(user_id):
    from app.models import User # Импортируем User внутри функции
    
    #return db.session.get(User, int(user_id)) # Используем get для получения пользователя по ID
    from flask import current_app
    current_app.logger.info(f"Loading user with ID: {user_id}, Type: {type(user_id)}")
    user = db.session.get(User, int(user_id))
    if user:
        current_app.logger.info(f"User loaded: {user.name}, Active: {user.is_active}")
    else:
        current_app.logger.warning(f"User with ID {user_id} not found in database.")
    return user

def create_app():
    app = Flask(__name__)
    # app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
    # app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # Рекомендуется отключить
    # app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here') # Установите SECRET_KEY
    app.config.from_object(Config)

    # Настройка LoginManager
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login' # Указываем маршрут для страницы входа
    login_manager.login_message = "Пожалуйста, войдите для доступа к этой странице."
    login_manager.login_message_category = "info"
    
    # Инициализируем расширения
    db.init_app(app)
    migrate.init_app(app, db) # Flask-Migrate нужен экземпляр db
    # подключаем файл models.py со структурой базы
    with app.app_context():
        from app import models
        
    # Регистрируем blueprints 
    from .routes.auth_routes import auth_bp
    from .routes.certificate_routes import certificates_bp
    from .routes.places_routes import places_bp
    from .routes.settings_routes import settings_bp
    from .routes.users_routes import users_bp
    from .routes.group_routes import group_bp
    from .routes.new_group_routes import bp as new_group_bp
    from .routes.clients_routes import clients_bp 
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(places_bp)
    app.register_blueprint(clients_bp)
    app.register_blueprint(certificates_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(new_group_bp)
    app.register_blueprint(group_bp)
    
    return app