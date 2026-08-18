# app/routes/clients_routes.py
from flask import Blueprint, flash, redirect, render_template, current_app, request, url_for, jsonify
from flask_login import login_required
from app import db
from app.models import Client, Certificate # Импортируем Certificate для проверки связей
import re

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/clients', methods=['GET', 'POST'])
@login_required
def list_clients():
    current_app.logger.info("Доступ к списку клиентов")

    if request.method == 'POST':
        action = request.form.get('action') # Получаем действие из формы

        if action == 'create':
            # Обработка формы создания клиента
            #name = request.form.get('name')
            #full_name = request.form.get('fullName')
            full_name = (request.form.get('fullName') or '').strip()
            last_name = (request.form.get('lastName') or '').strip()
            first_name = (request.form.get('firstName') or '').strip()
            second_name = (request.form.get('secondName') or '').strip()
            phone = request.form.get('phone')
            note = request.form.get('note')

            # нормализация
            phone = re.sub(r"\D", "", phone)
            if phone.startswith("8"):
                phone = "7" + phone[1:]
                
            parts = full_name.split()
            
            # Валидация (минимальная)
            if full_name or (last_name and first_name ):
                try:
                    val_phone = phone if phone else None
                    val_note = note if note else None
                    new_client = Client(
                        name=full_name,  # пока оставляем старое поле
                        #lastName=parts[0] if len(parts) > 0 else None,
                        lastName = last_name,
                        firstName = first_name,
                        #firstName=parts[1] if len(parts) > 1 else None,
                        #secondName=parts[2] if len(parts) > 2 else None,
                        secondName=second_name,
                        phone=val_phone,
                        note=val_note
                    )

                    db.session.add(new_client)
                    db.session.commit()

                    current_app.logger.info(f"Создан клиент: {new_client.full_name}")
                    flash(f'✅ Клиент "{new_client.full_name}" успешно создан!', 'success')
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
                            flash(f'❌ Невозможно удалить клиента "{client.full_name}", так как с ним связаны сертификаты.', 'warning')
                        else:
                            # Удаляем место
                            db.session.delete(client)
                            db.session.commit()
                            current_app.logger.info(f"Удален клиент: {client.full_name}")
                            flash(f'✅ Клиент "{client.full_name}" успешно удален!', 'success')
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

        elif action == 'edit':
            client_id = request.form.get('client_id')

            #full_name = request.form.get('fullName')
            full_name = (request.form.get('fullName') or '').strip()
            if (full_name == ''):
                full_name = request.form.get('lastName')+' '+request.form.get('firstName')+' '+request.form.get('secondName')
            lastName = request.form.get('lastName')
            firstName = request.form.get('firstName')
            secondName = request.form.get('secondName')
            phone = request.form.get('phone')
            email = request.form.get('email')
            externalId = request.form.get('externalId')
            note = request.form.get('note')

            # нормализация
            phone = re.sub(r"\D", "", phone)
            if phone.startswith("8"):
                phone = "7" + phone[1:]
                
            parts = full_name.split()
            
            #if client_id and full_name:
            if client_id:
                try:
                    client = db.session.get(Client, int(client_id))

                    if client:
                        client.name = full_name
                        client.lastName = lastName
                        client.firstName=firstName if firstName else None
                        client.secondName=secondName if secondName else None
                        client.phone = phone if phone else None
                        client.email = email if email else None
                        client.externalId = externalId if externalId else None
                        client.note = note if note else None

                        db.session.commit()

                        flash(f'✅ Клиент "{client.full_name}" обновлен!', 'success')
                        print(client)

                    else:
                        flash('❌ Клиент не найден.', 'danger')

                except Exception as e:
                    db.session.rollback()

                    current_app.logger.error(f"Ошибка обновления клиента: {e}")

                    flash(f'❌ Ошибка обновления клиента: {str(e)}', 'danger')
                    
        else:
            # Если action не 'create' и не 'delete', или вообще отсутствует
            flash('⚠️ Неизвестное действие.', 'warning')

        # После обработки POST-запроса (любого действия) перенаправляем на GET /places
        return redirect(url_for('clients.list_clients'))
    # GET-запрос: отображаем список
    # Получаем все места из базы данных
    clients = db.session.execute(db.select(Client)).scalars().all()
    return render_template('settings/clients_list.html', clients=clients)

# маршрут для создания клиентов в любом месте, кроме основной страницы с клиентами
@clients_bp.route('/api/clients', methods=['POST'])
@login_required
def create_client_api():

    data = request.get_json()
    print(data)
    
    #full_name = (data.get("fullName") or "").strip()
    lastName = (data.get("lastName") or "").strip()
    firstName = (data.get("firstName") or "").strip()
    secondName = (data.get("secondName") or "").strip()
    
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip()
    externalId = (data.get("externalId") or "").strip()
    note = (data.get("note") or "").strip()

    # нормализация
    phone = re.sub(r"\D", "", phone)
    if phone.startswith("8"):
        phone = "7" + phone[1:]
    #parts = full_name.split()
    
    if not lastName:
        return jsonify({
            "success": False,
            "message": "Имя клиента обязательно"
        }), 400

    try:
        # client = Client(
        #     name=full_name,
        #     lastName=parts[0] if len(parts) > 0 else None,
        #     firstName=parts[1] if len(parts) > 1 else None,
        #     secondName=parts[2] if len(parts) > 2 else None,
        #     phone=phone or None,
        #     note=note or None
        # )

        client = Client(
            name = lastName+" "+firstName+" "+secondName,
            lastName = lastName,
            firstName = firstName or None,
            secondName = secondName or None,
            phone=phone or None,
            email = email or None,
            externalId = externalId or None,
            note = note or None
        )
        
        db.session.add(client)
        db.session.commit()

        current_app.logger.info(
            f"Создан клиент через API: {client.full_name}"
        )

        return jsonify({
            "success": True,
            "client": {
                "id": client.id,
                "name": client.full_name,
                "phone": client.phone,
                "note": client.note
            }
        })

    except Exception as e:
        db.session.rollback()

        current_app.logger.error(
            f"Ошибка создания клиента через API: {e}"
        )

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500