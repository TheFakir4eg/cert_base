# app/routes/places_routes.py
import re

from flask import Blueprint, flash, jsonify, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Place, Certificate 
from sqlalchemy.exc import IntegrityError

places_bp = Blueprint('places', __name__)

@places_bp.route('/places', methods=['GET', 'POST'])
@login_required
def list_places():
    current_app.logger.info("Доступ к списку мест")

    if request.method == 'POST':
        action = request.form.get('action') # Получаем действие из формы

        if action == 'create':
            # Обработка формы создания места
            name = request.form.get('name')
            address = request.form.get('address')
            note = request.form.get('note')

            # Валидация (минимальная)
            if name:
                try:
                    addr = address if address else None
                    val_note = note if note else None
                    new_place = Place(name=name, address=addr, note=val_note)

                    db.session.add(new_place)
                    db.session.commit()

                    current_app.logger.info(f"Создано место: {new_place.name}")
                    flash(f'✅ Место "{name}" успешно создано!', 'success')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при создании места: {e}")
                    flash(f'❌ Ошибка при создании места: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните обязательные поля формы.', 'warning')

        elif action == 'delete':
            # Обработка формы удаления места
            place_id = request.form.get('place_id') # Получаем ID места из формы

            if place_id:
                try:
                    place_id = int(place_id)
                    place = db.session.get(Place, place_id)

                    if place:
                        # Проверим, есть ли сертификаты, связанные с этим местом
                        associated_certificates = db.session.execute(
                            db.select(Certificate).filter_by(place_id=place_id)
                        ).scalars().all()

                        if associated_certificates:
                            flash(f'❌ Невозможно удалить место "{place.name}", так как с ним связаны сертификаты.', 'warning')
                        else:
                            # Удаляем место
                            db.session.delete(place)
                            db.session.commit()
                            current_app.logger.info(f"Удалено место: {place.name}")
                            flash(f'✅ Место "{place.name}" успешно удалено!', 'success')
                    else:
                        flash('❌ Место не найдено.', 'danger')

                except ValueError:
                    current_app.logger.error(f"Неверный формат ID места: '{place_id}'")
                    flash('❌ Неверный формат ID места.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при удалении места: {e}")
                    flash(f'❌ Ошибка при удалении места: {str(e)}', 'danger')
            else:
                flash('⚠️ Не указан ID места для удаления.', 'warning')

        else:
            # Если action не 'create' и не 'delete', или вообще отсутствует
            flash('⚠️ Неизвестное действие.', 'warning')

        # После обработки POST-запроса (любого действия) перенаправляем на GET /places
        return redirect(url_for('places.list_places'))

    # GET-запрос: отображаем список
    # Получаем все места из базы данных
    places = db.session.execute(db.select(Place)).scalars().all()
    return render_template('places/list.html', places=places)

# марушрут для создания мест через ajax
@places_bp.post("/places/create")
@login_required
def create_place():
    data = request.get_json()
    name = data["name"].strip()
    if not name:
        return jsonify({
            "success": False,
            "error": "Укажите название места"
        }), 400        
        
    try:
        new_place = Place(
            name=name,
            address = data.get("address"), 
            note = data.get("note") 
        )

        db.session.add(new_place)
        db.session.commit()
        current_app.logger.info(f"Создано место: {new_place.name}")
        return jsonify({
            "success": True,
            "message": "Место создано",
            "place": {
                "id": new_place.id,
                "name": new_place.name,
                "address": new_place.address,
                "note": new_place.note
            }
        })

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Место уже существует"
        }), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return jsonify({
            "success": False,
            "error": "Внутренняя ошибка сервера"
        }), 500
        
# марушрут для редактирования мест через ajax
@places_bp.post("/places/edit")
@login_required
def edit_place():
    data = request.get_json()
    name = data["name"].strip()
    if not name:
        return jsonify({
            "success": False,
            "error": "Укажите название места"
        }), 400        
        
    try:
        #
        edit_place = db.session.get(Place, int(data["place_id"]))    
        if not edit_place:
            db.session.rollback()
            return jsonify({
                "success": False,
                "error": "Место не найдено"
            }), 400  
        edit_place.name = data["name"]
        edit_place.address = data.get("address")
        edit_place.note = data.get("note")   
        db.session.commit()
        current_app.logger.info(f"Обновлёно место: {name}")
        return jsonify({
            "success": True,
            "message": "Место обновлено",
            "place": {
                "id": edit_place.id,
                "name": edit_place.name,
                "address": edit_place.address,
                "note": edit_place.note
                }
            }) 
    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500