# app/routes/certificates_routes.py
from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, current_app, request, url_for
from flask_login import login_required,current_user
from sqlalchemy import Cast, Integer, func
from app import db
from app.models import Certificate, CertificateSeries, CertificateUsage, Client, Place, ServiceGroup, User
from app.utils.permissions import permission_required
from app.services.certificate_service import get_certificate_usages, spend_certificate, validate_certificate_series
from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal

certificates_bp = Blueprint('certificates', __name__)

@certificates_bp.route('/certificates', methods=['GET', 'POST'])
@login_required
@permission_required("certificates_page")
def list_certificates():
    current_app.logger.info("Доступ к списку сертификатов")
    
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'create':
            #expiration_value = ''
            # Обработка формы создания сертификата
            reason = request.form.get('reason')
            series = request.form.get('series')
            number = request.form.get('number')
            place_id = int(request.form.get('place_id')) if request.form.get('place_id') else None
            mol_id = int(request.form.get('mol_id')) if request.form.get('mol_id') else None
            spending_type = request.form.get('spending_type')
            require_original = request.form.get('require_original') is not None
            require_stamp = request.form.get('require_stamp') is not None
            is_single_use = request.form.get('is_single_use') is not None
            max_50_percent = request.form.get('max_50_percent') is not None
            total_amount = request.form.get('total_amount')
            servicegroup_id_str = request.form.get('servicegroup_id')
            note = request.form.get('note')
            expiration_type = request.form.get('expiration_type')
            
            if expiration_type == 'unlimited':
                expiration_value = None

            elif expiration_type == 'date':
                expiration_value = datetime.strptime(
                    request.form.get('expiration_date'),
                    '%Y-%m-%d'
                ).date()

            elif expiration_type == 'months':
                months = int(request.form.get('expiration_months'))

                expiration_value = (
                    datetime.now().date()
                    + relativedelta(months=months)
                )

            else:
                expiration_value = None

            existing_cert = db.session.execute(
                db.select(Certificate).where(
                    Certificate.series == series,
                    Certificate.number == number
                )
            ).scalar_one_or_none()
            
            # проверяем существование сертификата с полученными данными (серия и номер) 
            if existing_cert:
                return jsonify({
                    "success": False,
                    "message": "Сертификат уже существует"
                }), 400
                
            # проверка серии и номинала
            validation_error = validate_certificate_series(
                series,
                total_amount
            )

            if validation_error:
                return jsonify({
                    "success": False,
                    "message": validation_error
                }), 400
                
            try:
                # Конвертируем дату (если указана)
                #from datetime import datetime
                create_date = datetime.now()

                # Конвертируем ID
                servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None
                user_id = int(current_user.id) # в качестве создателя пишем текущего пользователя

                # Создаём новый сертификат
                new_cert = Certificate(
                    number=number,
                    create_date=create_date,
                    reason=reason,
                    series=series,
                    total_amount=total_amount,
                    servicegroup_id=servicegroup_id,
                    user_id=user_id, # ID пользователя-создателя (обязательно)
                    place_id = place_id,
                    mol_id = mol_id,
                    spending_type = spending_type,
                    require_original = require_original,
                    require_stamp = require_stamp,
                    is_single_use = is_single_use,
                    max_50_percent = max_50_percent,
                    expiration_date = expiration_value,
                    note=note
                )

                db.session.add(new_cert)
                db.session.commit()

                current_app.logger.info("=== CREATE CERTIFICATE ===")

                for key, value in request.form.items():
                    current_app.logger.info(f"{key}: {value}")
                    
                return jsonify({
                    "success": True,
                    "message": "Сертификат успешно создан"
                })
                
            except Exception as e:
                db.session.rollback()

                return jsonify({
                    "success": False,
                    "message": str(e)
                }), 500
        
        # массовое заведение
        elif action == "bulk_create":
            #массив номеров (для случая заведения сертификатов без номеров)
            numbers = [] 
            qty = int(request.form.get("notnumber-qty")) if request.form.get("notnumber-qty") else None
            # чекбокс "Сертификаты без номеров"
            without_numbers = request.form.get("notnumber") is not None
            # Обработка формы создания сертификата
            reason = request.form.get('reason')
            series = request.form.get('series')
            #number = request.form.get('number')
            place_id = int(request.form.get('place_id')) if request.form.get('place_id') else None
            mol_id = int(request.form.get('mol_id')) if request.form.get('mol_id') else None
            spending_type = request.form.get('spending_type')
            require_original = request.form.get('require_original') is not None
            require_stamp = request.form.get('require_stamp') is not None
            is_single_use = request.form.get('is_single_use') is not None
            max_50_percent = request.form.get('max_50_percent') is not None
            total_amount = request.form.get('total_amount')
            servicegroup_id_str = request.form.get('servicegroup_id')
            note = request.form.get('note')
            expiration_type = request.form.get('expiration_type')
            
            if expiration_type == 'unlimited':
                expiration_value = None

            elif expiration_type == 'date':
                expiration_value = datetime.strptime(
                    request.form.get('expiration_date'),
                    '%Y-%m-%d'
                ).date()

            elif expiration_type == 'months':
                months = int(request.form.get('expiration_months'))

                expiration_value = (
                    datetime.now().date()
                    + relativedelta(months=months)
                )

            else:
                expiration_value = None
                
            if not without_numbers:
                start = int(request.form.get("first_number"))
                end = int(request.form.get("last_number"))      
                numbers = [
                    str(i)
                    for i in range(start, end + 1)
                ]
                
                if end - start > 500:
                    return jsonify({
                            "success": False,
                            "message": "Слишком большой диапазон"
                        }), 400
                    
                existing = db.session.execute(
                        db.select(Certificate.number)
                        .where(
                            Certificate.series == series,
                            Certificate.number.in_(
                                [str(num) for num in range(start, end + 1)]
                            )
                        )
                    ).all()
                
                # проверяем существование сертификата с полученными данными (серия и номер) 
                if existing:
                    return jsonify({
                        "success": False,
                        "message": "В выбранном диапазоне уже существуют сертификаты"
                    }), 400
            # чекбокс "сертфикаты без номера" активен        
            else:
                existing_series = db.session.execute(
                    db.select(Certificate.id)
                    .where(Certificate.series == series)
                    .limit(1)
                ).scalar()
                existing_counter = CertificateSeries.query.filter_by(
                    series=series
                ).first()
                if existing_series:
                    return jsonify({
                        "success": False,
                        "message": "В указанной серии существуют сертификаты"
                    }), 400
                if existing_counter:
                    return jsonify({
                        "success": False,
                        "message": "Указанная серия уже существует"
                    }), 400
                if qty is None or qty <= 0:
                    return jsonify({
                        "success": False,
                        "message": "Количество должно быть больше нуля."
                    }), 400
                # ограничиваем количество безномерных сертификатов в рамках одного заведения
                elif qty > 500:
                    return jsonify({
                        "success": False,
                        "message": "Слишком большое количество"
                    }), 400
                else: numbers = [None] * qty
            
            # проверка серии и номинала
            validation_error = validate_certificate_series(
                series,
                total_amount
            )

            if validation_error:
                return jsonify({
                    "success": False,
                    "message": validation_error
                }), 400
                
            try:
                certs = []
                create_date = datetime.now()
                # Конвертируем ID
                servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None
                user_id = int(current_user.id) # в качестве создателя пишем текущего пользователя
                
                #for num in range(start, end + 1):
                for num in numbers:
                    certs.append(Certificate(
                        number=num,
                        create_date=create_date,
                        reason=reason,
                        series=series,
                        total_amount=total_amount,
                        servicegroup_id=servicegroup_id,
                        user_id=user_id, # ID пользователя-создателя (обязательно)
                        place_id = place_id,
                        mol_id = mol_id,
                        spending_type = spending_type,
                        require_original = require_original,
                        require_stamp = require_stamp,
                        is_single_use = is_single_use,
                        max_50_percent = max_50_percent,
                        expiration_date = expiration_value,
                        note=note
                    ))
                if without_numbers:
                    db.session.add(
                        CertificateSeries(
                            series=series,
                            max_number=qty
                        )
                    )

                db.session.add_all(certs)
                db.session.commit()
                
                #count = end - start + 1
                count = len(certs)
                current_app.logger.info("=== CREATE BULK CERTIFICATE ===")
                return jsonify({
                    "success": True,
                    "message": f"Успешно создано сертификатов: {count}"
                })
            
            except Exception as e:
                db.session.rollback()

                return jsonify({
                    "success": False,
                    "message": str(e)
                }), 500
                
        elif action == 'edit':
            cert_id_str = request.form.get('cert_id')

            if not cert_id_str:
                flash('❌ Не выбран сертификат для редактирования.', 'danger')
                return redirect(url_for('certificates.list_certificates'))

            cert = db.session.get(Certificate, int(cert_id_str))

            if not cert:
                flash('❌ Сертификат не найден.', 'danger')
                return redirect(url_for('certificates.list_certificates'))

            # получаем данные из формы
            reason = request.form.get('reason')
            series = request.form.get('series')
            number = request.form.get('number')
            place_id = int(request.form.get('place_id')) if request.form.get('place_id') else None
            mol_id = int(request.form.get('mol_id')) if request.form.get('mol_id') else None
            spending_type = request.form.get('spending_type')
            require_original = bool(request.form.get("require_original"))
            require_stamp = bool(request.form.get("require_stamp"))
            is_single_use = bool(request.form.get("is_single_use"))
            max_50_percent = bool(request.form.get("max_50_percent"))
            total_amount = request.form.get('total_amount')
            servicegroup_id_str = request.form.get('servicegroup_id')
            note = request.form.get('note')
            expiration_type = request.form.get('expiration_type')
            
            if expiration_type == 'unlimited':
                expiration_value = None

            elif expiration_type == 'date':
                expiration_value = datetime.strptime(
                    request.form.get('expiration_date'),
                    '%Y-%m-%d'
                ).date()

            elif expiration_type == 'months':
                months = int(request.form.get('expiration_months'))

                expiration_value = (
                    datetime.now().date()
                    + relativedelta(months=months)
                )

            else:
                expiration_value = None

            # проверка уникальности серии + номера
            existing_cert = db.session.execute(
                db.select(Certificate).where(
                    Certificate.series == series,
                    Certificate.number == number,
                    Certificate.id != cert.id
                )
            ).scalar_one_or_none()

            if existing_cert:
                return jsonify({
                    "success": False,
                    "message": "Сертификат с такой серией и номером уже существует."
                }), 400

            # проверка бизнес-правила серии
            validation_error = validate_certificate_series(
                series,
                total_amount
            )

            if validation_error:
                return jsonify({
                    "success": False,
                    "message": validation_error
                }), 400

            try:
                edit_date = datetime.now()

                # Конвертируем ID
                servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None
                user_id = int(current_user.id) # в качестве создателя пишем текущего пользователя
    
                cert.number=number
                cert.edit_date=edit_date
                cert.reason=reason
                cert.series=series
                cert.total_amount=total_amount
                cert.place_id = place_id
                cert.mol_id = mol_id
                cert.spending_type = spending_type
                cert.require_original = require_original
                cert.require_stamp = require_stamp
                cert.is_single_use = is_single_use
                cert.max_50_percent = max_50_percent
                cert.expiration_date = expiration_value
                cert.note=note
                

                cert.servicegroup_id = (
                    int(servicegroup_id_str)
                    if servicegroup_id_str
                    else None
                )

                cert.edit_user_id = int(current_user.id)
                db.session.commit()
                #current_app.logger.info(cert[])
                current_app.logger.info(f"Обновлён сертификат ID={cert.id}")
                
                return jsonify({
                    "success": True,
                    "message": "Сертификат успешно обновлён"
                })
                # flash(
                #     '✅ Сертификат успешно обновлён!',
                #     'success'
                # )

            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Ошибка обновления сертификата: {e}")
                return jsonify({
                    "success": False,
                    "message": str(e)
                }), 500
        
    # Получаем все сертификаты из базы данных
    certificates = db.session.execute(db.select(Certificate)).scalars().all()
    
    # GET-запрос или POST с другим действием: отображаем список
    # Получаем списки 
    places = db.session.execute(db.select(Place)).scalars().all()
    users = db.session.execute(db.select(User)).scalars().all()
    servicegroups = db.session.execute(db.select(ServiceGroup)).scalars().all()
    clients=db.session.execute(db.select(Client)).scalars().all()
    
    return render_template('certificates/list.html', 
                           certificates=certificates, 
                           places=places, 
                           users=users, 
                           servicegroups=servicegroups,
                           clients=clients
                           )
    
@certificates_bp.route("/certificates/issue", methods=["POST"])
@login_required
def issue_certificate():
    data = request.get_json()

    cert = Certificate.query.get_or_404(data["cert_id"])
    edit_user_id = int(current_user.id)
    # защита от повторной выдачи
    if cert.client_id:
        return {"error": "Сертификат уже выдан"}, 400

    cert.client_id = data["client_id"]
    cert.issue_date = data["issue_date"]
    # UPD 16.06.26 place_id -> issue_plcae_id
    cert.issue_place_id = data["place_id"]
    if data["note"]:
        if cert.note:
            cert.note += f"\n{data['note']}"
        else:
            cert.note = data["note"]
    cert.edit_user_id = int(edit_user_id) # в строку "кто изменил" пишем id текущего пользователя
    
    db.session.commit()

    return {"status": "ok"}


@certificates_bp.route("/certificates/<int:certificate_id>/spend", methods=["POST"])
@login_required
def spend_certificate_route(certificate_id):
    data = request.get_json()

    client_id = data.get("client_id")
    amount = data.get("amount")
    comment = data.get("comment")

    try:
        usage, deactivated = spend_certificate(
            certificate_id=certificate_id,
            client_id=client_id,
            amount=amount,
            user_id=current_user.id,
            comment=comment
        )

        return jsonify({
            "success": True,
            "message": "Средства успешно списаны",
            "deactivated": deactivated
        })

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400       

@certificates_bp.route("/certificates/<int:certificate_id>/usages", methods=["GET"])
@login_required
def get_certificate_usages(certificate_id):

    certificate = Certificate.query.get_or_404(certificate_id)

    usages = (
        CertificateUsage.query
        .filter_by(certificate_id=certificate_id)
        .order_by(CertificateUsage.created_at.desc())
        .all()
    )

    result = []
    for u in usages:
        result.append({
            "amount": float(u.amount),
            "client": u.client.name or "",
            "comment": u.comment or "",
            "date": u.created_at.strftime("%d.%m.%Y %H:%M"),
            "user": u.user.name
        })

    return jsonify(result)

@certificates_bp.post("/certificates/<int:certificate_id>/close")
@login_required
def close_certificate(certificate_id):
    data = request.get_json() or {}
    comment = data.get("comment", "").strip()

    if not comment:
        return jsonify({"error": "Необходимо указать причину вывода"}), 400

    cert = db.session.get(Certificate, certificate_id)
    if not cert:
        return jsonify({"error": "Not found"}), 404

    had_balance = cert.balance > 0

    cert.active = False
    cert.edit_user_id = current_user.id

    record = f"Причина вывода сертификата: {comment}"

    if cert.note:
        cert.note += f"\n\n{record}"
    else:
        cert.note = record

    db.session.commit()

    return jsonify({
        "success": True,
        "message": (
            "Погашен сертификат с положительным балансом"
            if had_balance
            else "Сертификат успешно выведен"
        )
    })

@certificates_bp.route("/certificates/<int:certificate_id>/restore", methods=["POST"])
@login_required
def restore_certificate(certificate_id):

    cert = db.session.get(Certificate, certificate_id)

    if not cert:
        return jsonify({"error": "Not found"}), 404

    cert.active = True
    cert.edit_user_id = current_user.id

    db.session.commit()

    return jsonify({"success": True})