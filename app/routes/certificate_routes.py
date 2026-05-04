# app/routes/certificates_routes.py
from datetime import datetime

from flask import Blueprint, flash, jsonify, redirect, render_template, current_app, request, url_for
from flask_login import login_required,current_user
from app import db
from app.models import Certificate, CertificateUsage, Client, Place, ServiceGroup, User
from app.utils.permissions import permission_required
from app.services.certificate_service import get_certificate_usages, spend_certificate

certificates_bp = Blueprint('certificates', __name__)

@certificates_bp.route('/certificates', methods=['GET', 'POST'])
@login_required
@permission_required("certificates_page")
def list_certificates():
    current_app.logger.info("Доступ к списку сертификатов")
    
    if request.method == 'POST':
        action = request.form.get('action')

        if action == 'create':
            # Обработка формы создания сертификата
            reason = request.form.get('reason')
            series = request.form.get('series')
            number = request.form.get('number')
            total_amount = request.form.get('total_amount')
            # Получаем ID как строки из формы
            servicegroup_id_str = request.form.get('servicegroup_id')
            note = request.form.get('note')

            # Валидация (минимальная)
            if number and total_amount: 
                try:
                    # Конвертируем дату (если указана)
                    from datetime import datetime
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

        elif action == 'edit':
            cert_id_str = request.form.get('cert_id')

            if not cert_id_str:
                flash('❌ Не выбран сертификат для редактирования.', 'danger')
                return redirect(url_for('certificates.list_certificates'))

            cert = db.session.get(Certificate, int(cert_id_str))
            edit_user_id = int(current_user.id)
            if not cert:
                flash('❌ Сертификат не найден.', 'danger')
                return redirect(url_for('certificates.list_certificates'))

            try:
                from datetime import datetime

                cert.reason = request.form.get('reason')
                cert.series = request.form.get('series')
                cert.number = request.form.get('number')
                cert.total_amount = request.form.get('total_amount')
                cert.note = request.form.get('note')

                # --- ID связи ---
                servicegroup_id_str = request.form.get('servicegroup_id')
                cert.servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None
                cert.edit_user_id = int(edit_user_id) # в строку "кто изменил" пишем id того текущего пользователя

                db.session.commit()

                current_app.logger.info(f"Обновлён сертификат ID={cert.id}")
                flash('✅ Сертификат успешно обновлён!', 'success')

            except Exception as e:
                db.session.rollback()
                current_app.logger.error(f"Ошибка обновления сертификата: {e}")
                flash(f'❌ Ошибка обновления сертификата: {str(e)}', 'danger')

            return redirect(url_for('certificates.list_certificates'))
        
    # Получаем все сертификаты из базы данных
    certificates = db.session.execute(db.select(Certificate)).scalars().all()
    # certificates = db.session.execute(
    #     db.select(Certificate).where(Certificate.active == True)
    # ).scalars().all()
    
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

    # защита от повторной выдачи
    if cert.client_id:
        return {"error": "Сертификат уже выдан"}, 400

    cert.client_id = data["client_id"]
    cert.issue_date = data["issue_date"]
    cert.note = data["note"]

    db.session.commit()

    return {"status": "ok"}

# @certificates_bp.route("/certificates/use", methods=["POST"])
# @login_required
# def use_certificate_route():
#     data = request.get_json()

#     try:
#         use_certificate(
#             certificate_id=int(data["cert_id"]),
#             amount=float(data["amount"]),
#             user_id=current_user.id,
#             comment=data.get("comment")
#         )

#         return {"status": "ok"}

#     except CertificateError as e:
#         return {"error": str(e)}, 400

@certificates_bp.route("/certificates/<int:certificate_id>/spend", methods=["POST"])
@login_required
def spend_certificate_route(certificate_id):
    data = request.get_json()

    amount = data.get("amount")
    comment = data.get("comment")

    try:
        usage = spend_certificate(
            certificate_id=certificate_id,
            amount=amount,
            user_id=current_user.id,
            comment=comment
        )

        return jsonify({
            "success": True,
            "message": "Средства успешно списаны"
        })

    except ValueError as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 400
        
# @certificates_bp.route("/certificates/<int:certificate_id>/usages", methods=["GET"])
# @login_required
# def certificate_usages_route(certificate_id):
#     usages = get_certificate_usages(certificate_id)
#     return jsonify(usages)

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
            "comment": u.comment or "",
            "date": u.created_at.strftime("%d.%m.%Y %H:%M"),
            "user": u.user.name
        })

    return jsonify(result)

@certificates_bp.route("/certificates/<int:certificate_id>/close", methods=["POST"])
@login_required
def close_certificate(certificate_id):

    cert = db.session.get(Certificate, certificate_id)

    if not cert:
        return jsonify({"error": "Not found"}), 404

    if cert.balance > 0:
        return jsonify({"error": "Нельзя закрыть сертификат с остатком"}), 400

    cert.active = False
    cert.edit_user_id = current_user.id

    db.session.commit()

    return jsonify({"success": True})

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