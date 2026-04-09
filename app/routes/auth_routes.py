# app/routes/auth_routes.py
import os
from flask import Blueprint, current_app, flash, redirect, render_template, request, session, url_for
from flask_login import login_user, logout_user, login_required, current_user 
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

@auth_bp.route('/')
def home():
    current_app.logger.info('Доступ к главной странице')
    if current_user.is_authenticated: # Используем current_user
        return redirect(url_for('auth.index')) # Перенаправляем на index
    return redirect(url_for('auth.login')) # Перенаправляем на login

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    current_app.logger.info('Доступ к странице входа')
    if current_user.is_authenticated: # Используем current_user
        current_app.logger.info('Пользователь уже авторизован')
        return redirect(url_for('auth.index')) # Перенаправляем на index

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        current_app.logger.info(f'Попытка входа пользователя: {username}')

        if username and password:
            user = db.session.execute(db.select(User).filter_by(login=username)).scalar_one_or_none()

            if user and user.check_password(password):
                login_user(user, remember=False) # Отмечаем пользователя как вошедшего
                current_app.logger.info(f'Успешная аутентификация пользователя: {username}')

                flash('✅ Успешная аутентификация! Добро пожаловать!', 'success')
                next_page = request.args.get('next') # Проверяем, был ли запрос с ?next=...
                # Проверяем next_page, чтобы избежать открытого перенаправления
                if not next_page or not next_page.startswith(request.url_root) or next_page == url_for('auth.logout'):
                    next_page = url_for('auth.index') # Перенаправляем на index по умолчанию или если next небезопасен/пустой
                return redirect(next_page) # Перенаправляем на целевую страницу (например, /index или ту, что была в ?next)
            else:
                current_app.logger.warning(f'Ошибка аутентификации для пользователя {username}')
                flash('❌ Ошибка аутентификации: неверный логин или пароль', 'danger')
        else:
            current_app.logger.warning('Не заполнены поля логин/пароль')
            flash('⚠️ Пожалуйста, заполните все поля', 'warning')

    return render_template('login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    username = current_user.name if current_user.is_authenticated else session.get('username', 'Пользователь')
    current_app.logger.info(f'Выход пользователя: {username}')
    logout_user() # Отмечаем пользователя как вышедшего
    flash(f'👋 До свидания, {username}! Вы вышли из системы.', 'info')
    return redirect(url_for('auth.login'))

@auth_bp.route('/index', methods=['GET', 'POST'])
@login_required 
def index():
    # current_user доступен здесь
    current_app.logger.info(f'Доступ к индексу пользователем: {current_user.name}')
    return render_template('index.html')
