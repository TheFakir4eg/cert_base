# /app/utils/permissions.py

from functools import wraps
from flask import flash, redirect, url_for, abort
from flask_login import current_user
from app.models import Resource, Permission

def has_permission(resource_name, permission_type='can_view'):
    """
    Проверяет, есть ли у текущего пользователя разрешение на ресурс
    
    Args:
        resource_name (str): имя ресурса
        permission_type (str): тип разрешения (can_view, can_add, can_edit, can_delete)
    
    Returns:
        bool: есть ли разрешение
    """
    if not current_user.is_authenticated:
        return False
    
    # Находим ресурс
    resource = Resource.query.filter_by(name=resource_name).first()
    if not resource:
        return False
    
    # Проверяем разрешение для группы пользователя
    permission = Permission.query.filter_by(
        group_id=current_user.group_id,
        resource_id=resource.id
    ).first()
    
    if permission:
        return getattr(permission, permission_type, False)
    
    return False

def permission_required(resource_name, permission_type='can_view'):
    """
    Декоратор для ограничения доступа к маршрутам
    
    Args:
        resource_name (str): имя ресурса
        permission_type (str): тип разрешения
    
    Returns:
        function: декорированная функция
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not has_permission(resource_name, permission_type):
                flash('У вас нет прав для доступа к этой странице', 'danger')
                return redirect(url_for('index'))  # или abort(403)
            return f(*args, **kwargs)
        return decorated_function
    return decorator