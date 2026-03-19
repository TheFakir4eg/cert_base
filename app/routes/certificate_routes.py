# app/routes/certificates_routes.py
from flask import Blueprint, flash, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Certificate, Place, User

certificates_bp = Blueprint('certificates', __name__)

@certificates_bp.route('/certificates', methods=['GET', 'POST'])
@login_required
def list_certificates():
    current_app.logger.info("Доступ к списку сертификатов")
    
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'create':
            # Обработка формы создания сертификата
            issue_date_str = request.form.get('issue_date')
            reason = request.form.get('reason')
            series = request.form.get('series')
            number = request.form.get('number')
            total_amount = request.form.get('total_amount')
            # Получаем ID как строки из формы
            place_id_str = request.form.get('place_id')
            user_id_str = request.form.get('user_id') # Берём ID создателя
            note = request.form.get('note')

            # Валидация (минимальная)
            if number and total_amount and user_id_str: # user_id обязателен
                try:
                    # Конвертируем дату (если указана)
                    from datetime import datetime
                    issue_date = datetime.strptime(issue_date_str, '%Y-%m-%d').date() if issue_date_str else None

                    # Конвертируем ID
                    # place_id может быть пустым (None), user_id - обязателен
                    place_id = int(place_id_str) if place_id_str else None
                    user_id = int(user_id_str) # user_id обязателен, предполагаем, что всегда приходит

                    # Проверим, существуют ли выбранные place и user
                    place = None
                    if place_id:
                        place = db.session.get(Place, place_id)
                        if not place:
                            flash('❌ Выбранное место выдачи не существует.', 'danger')
                            return redirect(url_for('certificates.list_certificates'))

                    user = db.session.get(User, user_id)
                    if not user:
                        flash('❌ Выбранный пользователь-создатель не существует.', 'danger')
                        return redirect(url_for('certificates.list_certificates'))

                    # Создаём новый сертификат
                    new_cert = Certificate(
                        number=number,
                        issue_date=issue_date,
                        reason=reason,
                        series=series,
                        total_amount=total_amount,
                        place_id=place_id, # ID места (может быть None)
                        user_id=user_id, # ID пользователя-создателя (обязательно)
                        expired_amount=total_amount, # Изначально остаток равен номиналу
                        note=note
                    )

                    db.session.add(new_cert)
                    db.session.commit()

                    current_app.logger.info(f"Создан сертификат: {new_cert.number}")
                    flash(f'✅ Сертификат "{new_cert.number}" успешно создан!', 'success')

                except ValueError as ve:
                    # Ошибка при конвертации даты или ID
                    current_app.logger.error(f"Ошибка валидации данных при создании сертификата: {e}")
                    flash(f'❌ Ошибка в данных: {str(e)}. Проверьте введённые значения.', 'danger')
                except Exception as e:
                    db.session.rollback()
                    current_app.logger.error(f"Ошибка при создании сертификата: {e}")
                    flash(f'❌ Ошибка при создании сертификата: {str(e)}', 'danger')
            else:
                flash('⚠️ Пожалуйста, заполните обязательные поля (номер, номинал, создатель).', 'warning')

            return redirect(url_for('certificates.list_certificates'))

        # elif action == 'delete': # Добавьте, если реализуете удаление
        #     pass
    # Получаем все сертификаты из базы данных
    certificates = db.session.execute(db.select(Certificate)).scalars().all()
    
    # GET-запрос или POST с другим действием: отображаем список
    # certificates = db.session.execute(
    #     db.select(Certificate).options(
    #         db.joinedload(Certificate.place), # Загружаем связанные Place
    #         db.joinedload(Certificate.user)   # Загружаем связанных User
    #     )
    # ).scalars().all()
    # Получаем списки мест и пользователей для формы создания
    places = db.session.execute(db.select(Place)).scalars().all()
    users = db.session.execute(db.select(User)).scalars().all()
    
    #return render_template('certificates/list.html', certificates=certificates)
    return render_template('certificates/list.html', certificates=certificates, places=places, users=users)