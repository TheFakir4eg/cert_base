# /app/routes/group_routes.py
from flask import Blueprint, current_app, jsonify, render_template, request
from flask_login import login_required
from sqlalchemy import select
from app import db
from app.models import Group, User
from app.utils.permissions import permission_required


group_bp = Blueprint('groups', __name__)

# @group_bp.route('/groups/<int:group_id>/update', methods=['POST'])
# @login_required
# #@permission_required('groups_management', 'can_edit') # Проверяем, есть ли у пользователя право редактировать группы/разрешения
# def update_group_api(group_id):
#     """
#     Обновляет разрешения и пользователей для указанной группы.

#     Expects JSON:
#     {
#         "permissions": [
#             {"resource_id": 1, "can_view": true, "can_add": false, ...},
#             ...
#         ],
#         "users_to_add": [1, 2, ...],
#         "users_to_remove": [3, 4, ...]
#     }
#     """
#     current_app.logger.info(f"API: Запрос на обновление группы ID {group_id}")

#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({"success": False, "message": "Неверный формат данных"}), 400

#         permissions_data = data.get('permissions', [])
#         users_to_add_ids = data.get('users_to_add', [])
#         users_to_remove_ids = data.get('users_to_remove', [])

#         # Проверяем, существует ли группа
#         group = db.session.get(Group, group_id)
#         if not group:
#             return jsonify({"success": False, "message": f"Группа с ID {group_id} не найдена"}), 404

#         # --- Обновление разрешений ---
#         for perm_info in permissions_data:
#             resource_id = perm_info.get('resource_id')
#             can_view = perm_info.get('can_view', False)
#             can_add = perm_info.get('can_add', False)
#             can_edit = perm_info.get('can_edit', False)
#             can_delete = perm_info.get('can_delete', False)

#             # Проверяем, существуют ли ресурс и группа
#             resource = db.session.get(Resource, resource_id)
#             if not resource:
#                 current_app.logger.warning(f"Ресурс с ID {resource_id} не найден для группы {group_id}")
#                 continue # Пропускаем, если ресурс не найден

#             # Проверяем, есть ли уже разрешение для этой группы и ресурса
#             existing_permission = db.session.execute(
#                 db.select(Permission).filter_by(group_id=group_id, resource_id=resource_id)
#             ).scalar_one_or_none()

#             if existing_permission:
#                 # Обновляем существующее разрешение
#                 existing_permission.can_view = can_view
#                 existing_permission.can_add = can_add
#                 existing_permission.can_edit = can_edit
#                 existing_permission.can_delete = can_delete
#                 current_app.logger.info(f"Обновлено разрешение для группы {group_id}, ресурс {resource_id}")
#             else:
#                 # Создаём новое разрешение
#                 new_permission = Permission(
#                     group_id=group_id,
#                     resource_id=resource_id,
#                     can_view=can_view,
#                     can_add=can_add,
#                     can_edit=can_edit,
#                     can_delete=can_delete
#                 )
#                 db.session.add(new_permission)
#                 current_app.logger.info(f"Создано новое разрешение для группы {group_id}, ресурс {resource_id}")

#         # --- Обновление пользователей ---
#         # Удаление пользователей из группы
#         if users_to_remove_ids:
#             users_to_remove = db.session.execute(
#                 db.select(User).filter(User.id.in_(users_to_remove_ids), User.group_id == group_id)
#             ).scalars().all()

#             for user in users_to_remove:
#                 user.group_id = None # Убираем привязку к группе
#                 current_app.logger.info(f"Пользователь {user.name} (ID: {user.id}) удалён из группы {group_id}")

#         # Добавление пользователей в группу
#         if users_to_add_ids:
#             users_to_add = db.session.execute(
#                 db.select(User).filter(User.id.in_(users_to_add_ids))
#             ).scalars().all()

#             for user in users_to_add:
#                 # Проверяем, что пользователь не в другой группе (опционально)
#                 # if user.group_id is not None and user.group_id != group_id:
#                 #     current_app.logger.warning(f"Пользователь {user.name} (ID: {user.id}) уже в группе {user.group_id}, не добавлен в {group_id}")
#                 #     continue
#                 # Или просто переносим
#                 user.group_id = group_id
#                 current_app.logger.info(f"Пользователь {user.name} (ID: {user.id}) добавлен в группу {group_id}")

#         # Сохраняем изменения в базе данных
#         db.session.commit()
#         current_app.logger.info(f"API: Успешно обновлена группа ID {group_id}")

#         return jsonify({"success": True, "message": "Группа успешно обновлена"}), 200

#     except Exception as e:
#         db.session.rollback()
#         current_app.logger.error(f"API: Ошибка при обновлении группы {group_id}: {e}")
#         return jsonify({"success": False, "message": "Внутренняя ошибка сервера"}), 500
    
# @group_bp.route('/groups/get_group_modal_content/<int:group_id>')
# @login_required
# #@permission_required('groups_management', 'can_edit')
# def get_group_modal_content(group_id):
#     """Возвращает HTML-фрагмент для модального окна редактирования группы."""
#     current_app.logger.info(f"Запрос содержимого модального окна для группы ID: {group_id}")

#     # Найдём группу
#     group = db.session.get(Group, group_id)
#     if not group:
#         return jsonify({'error': f'Группа с ID {group_id} не найдена.'}), 404

#     # Получаем всех пользователей, которые принадлежат этой группе
#     users_in_group = db.session.execute(
#         db.select(User).filter_by(group_id=group.id)
#     ).scalars().all()

#     # Получаем всех пользователей, НЕ принадлежащих этой группе (для выпадающего списка добавления)
#     all_users = db.session.execute(db.select(User)).scalars().all()
#     users_not_in_group = [user for user in all_users if user not in users_in_group]

#     # Получаем все ресурсы
#     resources = db.session.execute(db.select(Resource)).scalars().all()

#     # Получаем текущие разрешения для этой группы
#     permissions = db.session.execute(
#         db.select(Permission).filter_by(group_id=group.id)
#         .options(db.joinedload(Permission.resource))
#     ).scalars().all()

#     permissions_dict = {perm.resource_id: perm for perm in permissions if perm.resource}

#     # Рендерим частичный шаблон
#     html_content = render_template(
#         'groups/_group_modal_body.html', 
#         group=group,
#         resources=resources,
#         permissions_dict=permissions_dict,
#         users_in_group=users_in_group,
#         users_not_in_group=users_not_in_group
#     )

#     # Возвращаем HTML-фрагмент в JSON
#     return jsonify({'html': html_content})

# @group_bp.route('/groups/get_group_modal_content/new')
# @login_required
# #@permission_required('groups_management', 'can_add') # Право на создание групп
# def get_new_group_modal_content():
#     """фрагмент для модального окна создания новой группы."""
#     current_app.logger.info("Запрос содержимого модального окна для создания новой группы")

#     # Получаем все ресурсы и пользователей для выпадающих списков
#     resources = db.session.execute(select(Resource)).scalars().all()
#     all_users = db.session.execute(select(User)).scalars().all()

#     # Рендерим частичный шаблон для создания
#     html_content = render_template(
#         'groups/_new_group_modal_body.html',
#         resources=resources,
#         all_users=all_users # Передаём всех пользователей
#     )

#     return jsonify({'html': html_content})

# @group_bp.route('/groups/create', methods=['POST'])
# @login_required
# #@permission_required('groups_management', 'can_add') # Право на создание групп
# def create_group_api():
#     """
#     Создаёт новую группу и назначает ей разрешения и пользователей.

#     Expects JSON:
#     {
#         "name": "Название группы",
#         "permissions": [
#             {"resource_id": 1, "can_view": true, "can_add": false, ...},
#             ...
#         ],
#         "users_to_add": [1, 2, ...]
#     }
#     """
#     current_app.logger.info("API: Запрос на создание новой группы")

#     try:
#         data = request.get_json()
#         if not data:
#             return jsonify({"success": False, "message": "Неверный формат данных"}), 400

#         group_name = data.get('name')
#         permissions_data = data.get('permissions', [])
#         users_to_add_ids = data.get('users_to_add', [])

#         if not group_name:
#             return jsonify({"success": False, "message": "Не указано название группы"}), 400

#         # Проверяем, существует ли уже группа с таким именем
#         existing_group = db.session.execute(
#             select(Group).filter_by(text=group_name)
#         ).scalar_one_or_none()

#         if existing_group:
#             return jsonify({"success": False, "message": f"Группа с названием '{group_name}' уже существует"}), 400

#         # Создаём новую группу
#         new_group = Group(text=group_name)
#         db.session.add(new_group)
#         db.session.flush() # flush() чтобы получить ID новой группы до commit()

#         group_id = new_group.id
#         current_app.logger.info(f"Создана новая группа: {group_name} (ID: {group_id})")

#         # --- Обработка разрешений для новой группы ---
#         for perm_info in permissions_data:
#             resource_id = perm_info.get('resource_id')
#             can_view = perm_info.get('can_view', False)
#             can_add = perm_info.get('can_add', False)
#             can_edit = perm_info.get('can_edit', False)
#             can_delete = perm_info.get('can_delete', False)

#             # Проверяем, существует ли ресурс
#             resource = db.session.get(Resource, resource_id)
#             if not resource:
#                 current_app.logger.warning(f"Ресурс с ID {resource_id} не найден при создании группы {group_id}")
#                 continue # Пропускаем, если ресурс не найден

#             # Создаём разрешение для новой группы
#             new_permission = Permission(
#                 group_id=group_id,
#                 resource_id=resource_id,
#                 can_view=can_view,
#                 can_add=can_add,
#                 can_edit=can_edit,
#                 can_delete=can_delete
#             )
#             db.session.add(new_permission)
#             current_app.logger.info(f"Создано разрешение для новой группы {group_id}, ресурс {resource_id}")

#         # --- Обработка пользователей для новой группы ---
#         if users_to_add_ids:
#             users_to_add = db.session.execute(
#                 select(User).filter(User.id.in_(users_to_add_ids))
#             ).scalars().all()

#             for user in users_to_add:
#                 # Просто присваиваем новую группу
#                 user.group_id = group_id
#                 current_app.logger.info(f"Пользователь {user.name} (ID: {user.id}) добавлен в новую группу {group_id}")

#         # Сохраняем изменения в базе данных
#         db.session.commit()
#         current_app.logger.info(f"API: Успешно создана и настроена группа ID {group_id}")

#         return jsonify({"success": True, "message": f"Группа '{group_name}' успешно создана", "group_id": group_id}), 201

#     except Exception as e:
#         db.session.rollback()
#         current_app.logger.error(f"API: Ошибка при создании группы: {e}")
#         return jsonify({"success": False, "message": "Внутренняя ошибка сервера"}), 500