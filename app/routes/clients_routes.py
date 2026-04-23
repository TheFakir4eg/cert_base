# app/routes/clients_routes.py
from flask import Blueprint, flash, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Client, Certificate # Импортируем Certificate для проверки связей

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/clients', methods=['GET', 'POST'])
@login_required
def list_clients():
    current_app.logger.info("Доступ к списку клиентов")

    if request.method == 'POST':
        action = request.form.get('action') # Получаем действие из формы

        if action == 'create':
            # Обработка формы создания места
            name = request.form.get('name')
            phone = request.form.get('phone')
            note = request.form.get('note')

            # Валидация (минимальная)
            if name:
                try:
                    val_phone = phone if phone else None
                    val_note = note if note else None
                    new_client = Client(name=name, phone=val_phone, note=val_note)

                    db.session.add(new_client)
                    db.session.commit()

                    current_app.logger.info(f"Создан клиент: {new_client.name}")
                    flash(f'✅ Клиент "{name}" успешно создан!', 'success')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при создании клиента: {e}")
                    flash(f'❌ Ошибка при создании клиента: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните обязательные поля формы.', 'warning')

        elif action == 'delete':
            # Обработка формы удаления места
            client_id = request.form.get('client_id') # Получаем ID места из формы

            if client_id:
                try:
                    client_id = int(client_id)
                    client = db.session.get(Client, client_id)

                    if client:
                        # Проверим, есть ли сертификаты, связанные с этим клиентом
                        associated_certificates = db.session.execute(
                            db.select(Certificate).filter_by(client_id=client_id)
                        ).scalars().all()

                        if associated_certificates:
                            flash(f'❌ Невозможно удалить клиента "{client.name}", так как с ним связаны сертификаты.', 'warning')
                        else:
                            # Удаляем место
                            db.session.delete(client)
                            db.session.commit()
                            current_app.logger.info(f"Удален клиент: {client.name}")
                            flash(f'✅ Клиент "{client.name}" успешно удален!', 'success')
                    else:
                        flash('❌ Клиент не найдено.', 'danger')

                except ValueError:
                    current_app.logger.error(f"Неверный формат ID клиента: '{client_id}'")
                    flash('❌ Неверный формат ID клиента.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при удалении клиента: {e}")
                    flash(f'❌ Ошибка при удалении клиента: {str(e)}', 'danger')
            else:
                flash('⚠️ Не указан ID клиента для удаления.', 'warning')

        else:
            # Если action не 'create' и не 'delete', или вообще отсутствует
            flash('⚠️ Неизвестное действие.', 'warning')

        # После обработки POST-запроса (любого действия) перенаправляем на GET /places
        return redirect(url_for('clients.list_clients'))
    # GET-запрос: отображаем список
    # Получаем все места из базы данных
    clients = db.session.execute(db.select(Client)).scalars().all()
    return render_template('settings/clients_list.html', clients=clients)