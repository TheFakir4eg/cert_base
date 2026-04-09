# app/routes/settings_routes.py
from flask import Blueprint, flash, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Certificate, Group, Permission, Resource, ServiceGroup, User

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/groups')
@login_required
def list_groups():
    current_app.logger.info("Доступ к списку групп пользователей")
    # Получаем все группы из базы данных
    groups = db.session.execute(db.select(Group)).scalars().all()
    return render_template('settings/group_list.html', groups=groups)

@settings_bp.route('/settings')
@login_required
def settings():
    current_app.logger.info("Доступ к странице Настройки")
    return render_template('settings/settings.html')

@settings_bp.route('/servicegroup', methods=['GET', 'POST'])
@login_required
def servicegroup():
    current_app.logger.info("Доступ к списку групп услуг")
    if request.method == 'POST':
        action = request.form.get('action') # Получаем действие из формы

        if action == 'create':
            # Обработка формы создания места
            name = request.form.get('name')
            note = request.form.get('note')

            # Валидация (минимальная)
            if name:
                try:
                    val_note = note if note else None
                    new_servicegroup = ServiceGroup(name=name, note=val_note)

                    db.session.add(new_servicegroup)
                    db.session.commit()

                    current_app.logger.info(f"Создана группа: {new_servicegroup.name}")
                    flash(f'✅ Группа "{name}" успешно создана!', 'success')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при создании группы: {e}")
                    flash(f'❌ Ошибка при создании группы: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните обязательные поля формы.', 'warning')

        elif action == 'delete':
            # Обработка формы удаления группы
            servicegroup_id = request.form.get('servicegroup_id') # Получаем ID места из формы

            if servicegroup_id:
                try:
                    servicegroup_id = int(servicegroup_id)
                    servicegroup = db.session.get(ServiceGroup, servicegroup_id)

                    if servicegroup:
                        # Проверим, есть ли сертификаты, связанные с этой группой
                        associated_certificates = db.session.execute(
                            db.select(Certificate).filter_by(servicegroup_id=servicegroup_id)
                        ).scalars().all()

                        if associated_certificates:
                            flash(f'❌ Невозможно удалить группу "{servicegroup.name}", так как с ней связаны сертификаты.', 'warning')
                        else:
                            # Удаляем место
                            db.session.delete(servicegroup)
                            db.session.commit()
                            current_app.logger.info(f"Удалена группа: {servicegroup.name}")
                            flash(f'✅ Группа "{servicegroup.name}" успешно удалена!', 'success')
                    else:
                        flash('❌ Группа не найдена.', 'danger')

                except ValueError:
                    current_app.logger.error(f"Неверный формат ID группы: '{servicegroup_id}'")
                    flash('❌ Неверный формат ID группы.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при удалении группы: {e}")
                    flash(f'❌ Ошибка при удалении группы: {str(e)}', 'danger')
            else:
                flash('⚠️ Не указан ID группы для удаления.', 'warning')

        else:
            # Если action не 'create' и не 'delete', или вообще отсутствует
            flash('⚠️ Неизвестное действие.', 'warning')

        # После обработки POST-запроса (любого действия) перенаправляем на GET /places
        return redirect(url_for('settings.servicegroup'))

    # GET-запрос: отображаем список
    # Получаем все места из базы данных
    servicegroups = db.session.execute(db.select(ServiceGroup)).scalars().all()
    return render_template('settings/servicegroup.html', servicegroups = servicegroups)

@settings_bp.route('/group_permissions/<int:group_id>', methods=['GET', 'POST'])
@login_required
#@permission_required('groups_management', 'can_edit') # Требуется право на редактирование групп/разрешений
def group_permissions(group_id):
    current_app.logger.info(f"Доступ к редактированию разрешений для группы ID: {group_id}")

    # Найдём группу
    group = db.session.get(Group, group_id)
    if not group:
        flash(f'❌ Группа с ID {group_id} не найдена.', 'danger')
        return redirect(url_for('groups'))

    # Получаем всех пользователей, которые принадлежат этой группе
    users_in_group = db.session.execute(
        db.select(User).filter_by(group_id=group.id)
    ).scalars().all()
    
    if request.method == 'POST':
        # Обработка формы обновления разрешений
        # Получаем все ресурсы
        resources = db.session.execute(db.select(Resource)).scalars().all()

        for resource in resources:
            # Получаем значения из формы для текущего ресурса
            can_view = request.form.get(f'resource_{resource.id}_can_view') == 'on'
            can_add = request.form.get(f'resource_{resource.id}_can_add') == 'on'
            can_edit = request.form.get(f'resource_{resource.id}_can_edit') == 'on'
            can_delete = request.form.get(f'resource_{resource.id}_can_delete') == 'on'

            # Проверяем, существует ли уже запись разрешений для этой группы и ресурса
            permission = db.session.execute(
                db.select(Permission).filter_by(group_id=group.id, resource_id=resource.id)
            ).scalar_one_or_none()

            if permission:
                # Обновляем существующую запись
                permission.can_view = can_view
                permission.can_add = can_add
                permission.can_edit = can_edit
                permission.can_delete = can_delete
            else:
                # Создаём новую запись разрешений, если не существует
                # и если хотя бы одно разрешение установлено
                if can_view or can_add or can_edit or can_delete:
                    new_permission = Permission(
                        group_id=group.id,
                        resource_id=resource.id,
                        can_view=can_view,
                        can_add=can_add,
                        can_edit=can_edit,
                        can_delete=can_delete
                    )
                    db.session.add(new_permission)

        try:
            db.session.commit()
            current_app.logger.info(f"Разрешения для группы '{group.text}' (ID: {group.id}) обновлены.")
            flash(f'✅ Разрешения для группы "{group.text}" успешно обновлены!', 'success')
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Ошибка при обновлении разрешений для группы {group.id}: {e}")
            flash(f'❌ Ошибка при обновлении разрешений: {str(e)}', 'danger')

        # После сохранения возвращаемся на страницу редактирования этой же группы
        return redirect(url_for('settings.group_permissions', group_id=group_id))


    # GET-запрос: отображаем форму
    resources = db.session.execute(db.select(Resource)).scalars().all()
    permissions_dict = {}
    permissions = db.session.execute(
        db.select(Permission).filter_by(group_id=group.id)
    ).scalars().all()

    for perm in permissions:
        permissions_dict[perm.resource_id] = perm

    return render_template(
        'settings/group_permissions.html',
        group=group,
        resources=resources,
        permissions_dict=permissions_dict,
        users_in_group=users_in_group # Передаём список пользователей в шаблон
    )
    
@settings_bp.route('/create_group', methods=['GET', 'POST'])
@login_required
#@permission_required('groups_management', 'can_add') # Требуется право на добавление групп
def create_group():
    current_app.logger.info("Доступ к созданию новой группы")
    if request.method == 'POST':
        name = request.form.get('name')
        note = request.form.get('note')
        if name:
            try:
                new_group = Group(text=name, note=note)
                db.session.add(new_group)
                db.session.commit()
                flash(f'✅ Группа "{name}" успешно создана!', 'success')
                return redirect(url_for('groups'))
            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Ошибка при создании группы: {e}")
                flash(f'❌ Ошибка при создании группы: {str(e)}', 'danger')
        else:
            flash('⚠️ Пожалуйста, введите название группы.', 'warning')
    return render_template('settings/group_permissions.html')