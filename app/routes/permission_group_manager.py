# /app/routes/permission_group_manager.py

from flask import Blueprint, jsonify, request, render_template, current_app
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from app import db
from app.models import Group, Permission, Resource, User
import json
from datetime import datetime

pgm_bp = Blueprint('pgm', __name__)

# Вспомогательная функция для создания объекта разрешения
def create_permission_object(group_id, resource_id, permission_type):
    """Создает объект Permission на основе типа разрешения"""
    permission = Permission(
        group_id=group_id,
        resource_id=resource_id,
        can_view=(permission_type == 'view'),
        can_add=(permission_type == 'add'),
        can_edit=(permission_type == 'edit'),
        can_delete=(permission_type == 'delete')
    )
    return permission

@pgm_bp.route('/groups/<int:group_id>', methods=['GET'])
def get_group_api(group_id):
    """
    API для получения данных группы
    
    """
    try:
        # Современный способ получения группы с связанными данными
        stmt = select(Group).where(Group.id == group_id).options(
            selectinload(Group.permissions).selectinload(Permission.resource),
            selectinload(Group.users)
        )
        
        group = db.session.execute(stmt).scalar_one_or_none()
        
        if not group:
            return jsonify({'error': 'Группа не найдена'}), 404
        
        # Получаем разрешения
        permissions_stmt = select(Permission).where(Permission.group_id == group_id)
        permissions = db.session.execute(permissions_stmt).scalars().all()
        
        permissions_data = []
        for perm in permissions:
            # Определяем тип разрешения
            permission_type = None
            if perm.can_view:
                permission_type = 'view'
            elif perm.can_add:
                permission_type = 'add'
            elif perm.can_edit:
                permission_type = 'edit'
            elif perm.can_delete:
                permission_type = 'delete'
            
            if permission_type:
                permissions_data.append({
                    'resource_id': perm.resource_id,
                    'resource_name': perm.resource.name if perm.resource else None,
                    'permission_type': permission_type
                })
        
        # Получаем пользователей группы
        users_data = []
        if hasattr(group, 'users'):
            users_data = [{'id': user.id, 'name': user.name} for user in group.users]
        
        return jsonify({
            'id': group.id,
            'name': group.text,
            'permissions': permissions_data,
            'users': users_data,
            'created_at': group.created_at.isoformat() if hasattr(group, 'created_at') else None
        })
        
    except Exception as e:
        current_app.logger.error(f"Error loading group {group_id}: {str(e)}")
        return jsonify({'error': 'Внутренняя ошибка сервера'}), 500

@pgm_bp.route('/groups/empty-form', methods=['GET'])
def empty_group_form():
    """
    Возвращает HTML формы для создания группы
    """
    try:
        # Получаем список ресурсов
        resources_stmt = select(Resource).order_by(Resource.name)
        resources = db.session.execute(resources_stmt).scalars().all()
        
        # Получаем список пользователей (не входящих в группу)
        # Здесь можно добавить фильтрацию если нужно
        
        return render_template('settings/group_permissions.html', 
                              resources=resources,
                              group=None,
                              permissions=[])
    except Exception as e:
        current_app.logger.error(f"Error loading form: {str(e)}")
        return jsonify({'error': 'Ошибка загрузки формы'}), 500

@pgm_bp.route('/groups/<int:group_id>/form', methods=['GET'])
def get_group_form(group_id):
    """
    Возвращает HTML формы для редактирования группы
    """
    try:
        # Загружаем группу с данными
        stmt = select(Group).where(Group.id == group_id).options(
            selectinload(Group.permissions),
            selectinload(Group.users)
        )
        group = db.session.execute(stmt).scalar_one_or_none()
        
        if not group:
            return jsonify({'error': 'Группа не найдена'}), 404
        
        # Получаем ресурсы
        resources_stmt = select(Resource).order_by(Resource.name)
        resources = db.session.execute(resources_stmt).scalars().all()
        
        # Получаем разрешения
        permissions_stmt = select(Permission).where(Permission.group_id == group_id)
        permissions = db.session.execute(permissions_stmt).scalars().all()
        
        return render_template('settings/group_permissions.html',
                              resources=resources,
                              group=group,
                              permissions=permissions)
                              
    except Exception as e:
        current_app.logger.error(f"Error loading group form {group_id}: {str(e)}")
        return jsonify({'error': 'Ошибка загрузки формы'}), 500

@pgm_bp.route('/groups/save', methods=['POST'])
def save_group_api():
    """
    Сохранение группы (создание или редактирование)
    
    """
    try:
        action = request.form.get('action')
        group_name = request.form.get('group_name', '').strip()
        permissions_json = request.form.get('permissions', '[]')
        permissions_data = json.loads(permissions_json) if permissions_json else []
        
        # Валидация
        if not group_name:
            return jsonify({'success': False, 'message': 'Название группы обязательно'}), 400
        
        if not permissions_data:
            return jsonify({'success': False, 'message': 'Добавьте хотя бы одно разрешение'}), 400
        
        # Начинаем транзакцию
        group = None
        
        if action == 'create':
            # Создаем новую группу
            group = Group(text=group_name)
            db.session.add(group)
            db.session.flush()  # Получаем ID группы
            
        elif action == 'edit':
            # Получаем существующую группу
            group_id = request.form.get('group_id')
            if not group_id:
                return jsonify({'success': False, 'message': 'ID группы не указан'}), 400
            
            stmt = select(Group).where(Group.id == group_id)
            group = db.session.execute(stmt).scalar_one_or_none()
            
            if not group:
                return jsonify({'success': False, 'message': 'Группа не найдена'}), 404
            
            # Обновляем название
            group.text = group_name
            
            # Удаляем старые разрешения (используем delete)
            delete_stmt = delete(Permission).where(Permission.group_id == group_id)
            db.session.execute(delete_stmt)
        
        else:
            return jsonify({'success': False, 'message': 'Неизвестное действие'}), 400
        
        # Создаем новые разрешения
        for perm_data in permissions_data:
            # Проверяем обязательные поля
            if 'resource_id' not in perm_data or 'permission_type' not in perm_data:
                continue
                
            permission = create_permission_object(
                group.id,
                perm_data['resource_id'],
                perm_data['permission_type']
            )
            db.session.add(permission)
        
        # Сохраняем изменения
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Группа успешно сохранена',
            'group_id': group.id,
            'group_name': group.text
        })
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving group: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@pgm_bp.route('/groups/<int:group_id>', methods=['DELETE'])
def delete_group_api(group_id):
    """
    Удаление группы
    """
    try:
        # Проверяем существование группы
        stmt = select(Group).where(Group.id == group_id)
        group = db.session.execute(stmt).scalar_one_or_none()
        
        if not group:
            return jsonify({'success': False, 'message': 'Группа не найдена'}), 404
        
        # Удаляем связанные разрешения
        delete_stmt = delete(Permission).where(Permission.group_id == group_id)
        db.session.execute(delete_stmt)
        
        # Удаляем группу
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Группа удалена'})
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting group {group_id}: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@pgm_bp.route('/api/groups/search', methods=['GET'])
def search_groups():
    """
    Поиск групп
    """
    try:
        query = request.args.get('q', '').strip()
        
        if query:
            stmt = select(Group).where(Group.text.ilike(f'%{query}%')).limit(10)
        else:
            stmt = select(Group).limit(50)
        
        groups = db.session.execute(stmt).scalars().all()
        
        return jsonify([{
            'id': g.id,
            'name': g.text,
            'permissions_count': len(g.permissions) if hasattr(g, 'permissions') else 0,
            'users_count': len(g.users) if hasattr(g, 'users') else 0
        } for g in groups])
        
    except Exception as e:
        current_app.logger.error(f"Error searching groups: {str(e)}")
        return jsonify({'error': 'Ошибка поиска'}), 500

@pgm_bp.route('/api/users/search', methods=['GET'])
def search_users():
    """
    Поиск пользователей для добавления в группу
    """
    try:
        query = request.args.get('q', '').strip()
        exclude_group_id = request.args.get('exclude_group', type=int)
        
        # Базовый запрос
        stmt = select(User)
        
        # Поиск по имени
        if query:
            stmt = stmt.where(User.username.ilike(f'%{query}%'))
        
        # Исключаем пользователей уже в группе
        if exclude_group_id:
            # Подзапрос для пользователей в группе
            # Это зависит от вашей модели связи
            pass
        
        stmt = stmt.limit(10)
        users = db.session.execute(stmt).scalars().all()
        
        return jsonify([{
            'id': user.id,
            'username': user.username,
            'email': getattr(user, 'email', None),
            'full_name': getattr(user, 'full_name', user.username)
        } for user in users])
        
    except Exception as e:
        current_app.logger.error(f"Error searching users: {str(e)}")
        return jsonify({'error': 'Ошибка поиска'}), 500

@pgm_bp.route('/api/groups/<int:group_id>/users', methods=['POST', 'DELETE'])
def manage_group_users(group_id):
    """
    Управление пользователями группы
    POST - добавить пользователя
    DELETE - удалить пользователя
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'message': 'ID пользователя не указан'}), 400
        
        # Проверяем существование группы
        group_stmt = select(Group).where(Group.id == group_id)
        group = db.session.execute(group_stmt).scalar_one_or_none()
        
        if not group:
            return jsonify({'success': False, 'message': 'Группа не найдена'}), 404
        
        # Проверяем существование пользователя
        user_stmt = select(User).where(User.id == user_id)
        user = db.session.execute(user_stmt).scalar_one_or_none()
        
        if not user:
            return jsonify({'success': False, 'message': 'Пользователь не найден'}), 404
        
        if request.method == 'POST':
            # Добавляем пользователя в группу
            if user not in group.users:
                group.users.append(user)
                db.session.commit()
                return jsonify({'success': True, 'message': 'Пользователь добавлен'})
            else:
                return jsonify({'success': False, 'message': 'Пользователь уже в группе'}), 400
                
        elif request.method == 'DELETE':
            # Удаляем пользователя из группы
            if user in group.users:
                group.users.remove(user)
                db.session.commit()
                return jsonify({'success': True, 'message': 'Пользователь удален'})
            else:
                return jsonify({'success': False, 'message': 'Пользователь не найден в группе'}), 400
                
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error managing group users: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500