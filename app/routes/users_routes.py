# app/routes/users_routes.py
import re

from flask import Blueprint, render_template, current_app, request, flash, redirect, url_for, jsonify # Добавим jsonify, если будем использовать AJAX
from flask_login import current_user, login_required
from app import db
from app.models import User, Group, Place
from sqlalchemy.exc import IntegrityError

users_bp = Blueprint('users', __name__)

@users_bp.route('/users', methods=['GET', 'POST'])
@login_required
def list_users():
    current_app.logger.info("Доступ к списку пользователей")

    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'create':
            # Обработка формы создания пользователя
            login = request.form.get('login')
            name = request.form.get('name')
            password = request.form.get('password')
            group_id_str = request.form.get('group_id')
            place_id_str = request.form.get('place_id')

            # Валидация (минимальная)
            if login and group_id_str:
                try:
                    # Проверим, существует ли группа
                    group = db.session.get(Group, int(group_id_str))
                    if not group:
                        flash('❌ Выбранная группа не существует.', 'danger')
                        return redirect(url_for('users.list_users'))

                    # Проверим, не существует ли уже пользователь с таким именем
                    existing_user = db.session.execute(db.select(User).filter_by(name=login)).scalar_one_or_none()
                    if existing_user:
                        flash('❌ Пользователь с таким именем уже существует.', 'danger')
                        return redirect(url_for('users.list_users'))

                    exists = User.query.filter_by(login=login).first()
                    if exists:
                        flash("Пользователь с таким логином уже существует", "danger")
                        return redirect(url_for('users.list_users'))
                    
                    # Создаём нового пользователя
                    new_user = User(
                        login = login, 
                        name=name, 
                        group_id=int(group_id_str), 
                        place_id=int(place_id_str), 
                        note=f'Created by {current_user.name}')
                    new_user.set_password(password)
                    new_user.active = True

                    db.session.add(new_user)
                    db.session.commit()

                    current_app.logger.info(f"Создан пользователь: {new_user.name}")
                    flash(f'✅ Пользователь "{login}" успешно создан!', 'success')
                except ValueError:
                    current_app.logger.error(f"Неверный формат group_id: '{group_id_str}'")
                    flash(f'❌ Неверный формат ID группы.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при создании пользователя: {e}")
                    flash(f'❌ Ошибка при создании пользователя: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните все поля формы.', 'warning')

            return redirect(url_for('users.list_users'))

        elif action == 'edit':
            # Обработка формы редактирования пользователя
            user_id = request.form.get('user_id') # Получаем ID пользователя из формы
            name = request.form.get('name')
            group_id_str = request.form.get('group_id')
            place_id_str = request.form.get('place_id')
            new_password = request.form.get('password') # Пароль опционально
            active_status = request.form.get('active') # Получаем статус активности из формы

            if user_id and name and group_id_str:
                try:
                    # Найдём пользователя по ID
                    user = db.session.get(User, int(user_id))
                    if not user:
                        flash(f'❌ Пользователь с ID {user_id} не найден.', 'danger')
                        return redirect(url_for('users.list_users'))

                    # Проверим, существует ли группа
                    group = db.session.get(Group, int(group_id_str))
                    if not group:
                        flash('❌ Выбранная группа не существует.', 'danger')
                        return redirect(url_for('users.list_users'))

                    # Обновим данные пользователя
                    user.name = name
                    user.group_id = int(group_id_str)
                    # Обновим статус активности
                    user.active = (active_status == 'on') # 'on' если чекбокс активен, иначе False

                    # Обновим пароль, если он был введён
                    if new_password:
                        user.set_password(new_password)

                    db.session.commit()
                    current_app.logger.info(f"Обновлён пользователь: {user.name}")
                    flash(f'✅ Пользователь "{user.name}" успешно обновлён!', 'success')

                except ValueError:
                    current_app.logger.error(f"Неверный формат данных (user_id или group_id): '{user_id}', '{group_id_str}'")
                    flash(f'❌ Неверный формат данных.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при обновлении пользователя {user_id}: {e}")
                    flash(f'❌ Ошибка при обновлении пользователя: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните все обязательные поля формы.', 'warning')

            return redirect(url_for('users.list_users'))

    # GET-запрос: отображаем список
    users = db.session.execute(db.select(User).options(db.joinedload(User.user_group))).scalars().all()
    groups = db.session.execute(db.select(Group)).scalars().all()
    places = db.session.execute(db.select(Place)).scalars().all()
    return render_template('users/list.html', users=users, groups=groups, places=places)

# марушрут для создания пользователей через ajax
@users_bp.post("/users/create")
@login_required
def create_user():
    data = request.get_json()

    if not re.fullmatch(r"[a-zA-Z0-9._-]+", data["login"]):
            return jsonify({
                "success": False,
                "error": "Логин может содержать только латинские буквы, цифры и символы ._-"
            }), 400
            
    try:
        user = User(
            login=data["login"],
            name=data["name"],
            group_id=data["group_id"],
            place_id=data.get("place_id"),
            active=True
        )

        
        user.set_password(data["password"])

        db.session.add(user)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Пользователь создан",
            "user": {
                "id": user.id,
                "login": user.login,
                "name": user.name,
                "group": user.user_group.text,
                "active": user.active,
                "place_id": user.place_id,
                "group_id": user.group_id
            }
        })

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Логин уже существует"
        }), 400

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
        
# марушрут для редактирования пользователей через ajax
@users_bp.post("/users/edit")
@login_required
def edit_user():
    data = request.get_json()
    print(data)
    user_id = data["user_id"]
    login=data["login"]
    name=data["name"]
    group_id=data["group_id"]
    place_id=data.get("place_id")
    password=data.get("password")
    active=True
    
    if not re.fullmatch(r"[a-zA-Z0-9._-]+", login):
        return jsonify({
            "success": False,
            "error": "Логин может содержать только латинские буквы, цифры и символы ._-"
        }), 400
    
    if not place_id:
        return jsonify({
                "success": False,
                "error": "Укажите место работы"
            }), 400
        
    if user_id and name and group_id:
                try:
                    # Найдём пользователя по ID
                    edit_user = db.session.get(User, int(user_id))               
                    if not edit_user:
                        db.session.rollback()
                        return jsonify({
                            "success": False,
                            "error": "Пользователь не найден"
                        }), 400
                    # Проверяем группу
                    group = db.session.get(Group, int(group_id))
                    if not group:
                        db.session.rollback()
                        return jsonify({
                            "success": False,
                            "error": "Группа не найдена"
                        }), 400
                    # Проверяем группу
                    place = db.session.get(Place, int(place_id))
                    if not place:
                        db.session.rollback()
                        return jsonify({
                            "success": False,
                            "error": "Место не найдено"
                        }), 400
                        
                                        # Обновим данные пользователя
                    edit_user.name = name
                    edit_user.login = login
                    edit_user.group_id = int(group_id)
                    edit_user.place_id = int(place_id)
                    # Обновим статус активности
                    edit_user.active = (active == 'on') # 'on' если чекбокс активен, иначе False

                    # Обновим пароль, если он был введён
                    if password:
                        edit_user.set_password(password)

                    db.session.commit()
                    current_app.logger.info(f"Обновлён пользователь: {name}")
                    return jsonify({
                            "success": True,
                            "message": "Пользователь обновлен",
                            "user": {
                                "id": edit_user.id,
                                "login": edit_user.login,
                                "name": edit_user.name,
                                "group": edit_user.user_group.text,
                                "active": edit_user.active,
                                "place_id": edit_user.place_id,
                                "group_id": edit_user.group_id
                            }
                        })
                except IntegrityError:
                    db.session.rollback()
                    return jsonify({
                        "success": False,
                        "error": "Логин уже существует"
                    }), 400

                except Exception as e:
                    db.session.rollback()
                    return jsonify({
                        "success": False,
                        "error": str(e)
                    }), 500
    else:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Недостаточно данных"
        }), 400
    