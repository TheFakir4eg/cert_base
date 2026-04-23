# app/routes/settings_routes.py
from flask import Blueprint, flash, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Certificate, Group, ServiceGroup, User
from app.utils.permissions import permission_required


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
@permission_required("settings_page") 
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

@settings_bp.route("/api/groups/<int:group_id>/users")
def get_group_users(group_id):
    from app.models import User, Group
    from app import db

    group = Group.query.get_or_404(group_id)

    users = User.query.filter_by(group_id=group_id).all()

    return {
        "group": {
            "id": group.id,
            "text": group.text
        },
        "users": [u.id for u in users]  
    }