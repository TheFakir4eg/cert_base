# app/routes/certificates_routes.py
from datetime import date, datetime
from pathlib import Path
import json
from flask import Blueprint, flash, jsonify, redirect, render_template, current_app, request, url_for, abort, send_file
from flask_login import login_required,current_user
#from flask_sqlalchemy import extension
from sqlalchemy import Cast, Integer, func

from app import db
from app.models import Certificate, CertificateSeries, CertificateService, CertificateTemplate, CertificateTemplateLink, CertificateUsage, Client, Place, ServiceGroup, Services, TemplateVersion, User
from app.services.certificate_excel_export import CertificateExcelExporter
from app.services.transaction_service import create_transaction, get_certificate_transactions
from app.utils.permissions import permission_required
from datetime import datetime
from dateutil.relativedelta import relativedelta
from decimal import Decimal
from app.utils.audit import audit_create, audit_update
from app.services.certificate_service import (
    create_single_certificate,
    bulk_create_certificates,
    deactivate_certificate_template,
    update_certificate,
    get_certificate_usages,
    spend_certificate,
    validate_certificate_series,
    parse_templates,
    get_expiration_date
    )

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
            return create_single_certificate_route()
        
        # массовое заведение
        elif action == 'bulk_create':
            return bulk_create_certificates_route()
        
        # редактирование сертификата
        elif action == 'edit':
            return edit_certificate_route()
        
    # Получаем все сертификаты из базы данных
    # при этом фильтруем их по месту работы пользователя.
    # за исключением админов сервиса (group_id = 1)
    if current_user.group_id == 1:
        certificates = db.session.execute(db.select(Certificate)).scalars().all()
    else: 
        certificates = db.session.execute(db.select(Certificate)
                                        .where(Certificate.place_id == current_user.place_id)
                                        ).scalars().all()
    
    # GET-запрос или POST с другим действием: отображаем список
    # Получаем списки 
    places = db.session.execute(db.select(Place)).scalars().all()
    users = db.session.execute(db.select(User)).scalars().all()
    servicegroups = db.session.execute(db.select(ServiceGroup)).scalars().all()
    clients=db.session.execute(db.select(Client)).scalars().all()
    services=db.session.execute(db.select(Services)).scalars().all()
    
    return render_template('certificates/list.html', 
                           certificates=certificates, 
                           places=places, 
                           users=users, 
                           servicegroups=servicegroups,
                           clients=clients,
                           services=services
                           )
    
# ====================== CREATE ======================
def create_single_certificate_route():
    try:
        templates = parse_templates(request.form.get("templates"))
        expiration_value = get_expiration_date(request.form)

        create_single_certificate(
            form_data=request.form,
            templates=templates,
            expiration_value=expiration_value,
            user_id=current_user.id
        )

        return jsonify({"success": True, "message": "Сертификат успешно создан"})
        
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Ошибка создания сертификата: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    
# ====================== BULK CREATE ======================
def bulk_create_certificates_route():
    try:
        templates = parse_templates(request.form.get("templates"))
        expiration_value = get_expiration_date(request.form)

        count = bulk_create_certificates(
            form_data=request.form,
            templates=templates,
            expiration_value=expiration_value,
            user_id=current_user.id
        )

        return jsonify({
            "success": True,
            "message": f"Успешно создано сертификатов: {count}"
        })
        
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Ошибка массового создания: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


# ====================== EDIT ======================
def edit_certificate_route():
    try:
        templates = parse_templates(request.form.get("templates"))
        expiration_value = get_expiration_date(request.form)
        deleted_ids_str = parse_templates(request.form.get('deleted_template_ids', '[]'))
        new_templates_str = parse_templates(request.form.get('templates'))
        
        update_certificate(
            form_data=request.form,
            new_templates_data = new_templates_str,
            deleted_template_ids = deleted_ids_str,
            expiration_value=expiration_value,
            user_id=current_user.id
        )

        return jsonify({"success": True, "message": "Сертификат успешно обновлён"})
        
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Ошибка обновления сертификата: {e}")
        return jsonify({"success": False, "message": str(e)}), 500

@certificates_bp.route("/certificates/export", methods=["GET"])
@login_required
@permission_required("certificates_page")
def export_certificates():
    current_app.logger.info(
        "Экспорт списка сертификатов пользователем %s",
        current_user.id
    )

    # ID сертификатов, переданные frontend
    certificate_ids = request.args.getlist("id", type=int)

    if not certificate_ids:
        return jsonify({
            "error": "Не выбраны сертификаты для выгрузки"
        }), 400

    # Базовый запрос
    query = db.select(Certificate).where(
        Certificate.id.in_(certificate_ids)
    )

    # Проверка области доступа пользователя
    if current_user.group_id != 1:
        query = query.where(
            Certificate.place_id == current_user.place_id
        )

    certificates = (
        db.session.execute(query)
        .scalars()
        .all()
    )

    # ВАЖНО:
    # SQL IN (...) не гарантирует порядок ID,
    # поэтому восстанавливаем порядок,
    # который пришёл от frontend.
    certificates_by_id = {
        certificate.id: certificate
        for certificate in certificates
    }

    certificates = [
        certificates_by_id[certificate_id]
        for certificate_id in certificate_ids
        if certificate_id in certificates_by_id
    ]

    if not certificates:
        return jsonify({
            "error": "Нет доступных сертификатов для выгрузки"
        }), 404

    exporter = CertificateExcelExporter()
    output = exporter.export(certificates)

    return send_file(
        output,
        as_attachment=True,
        download_name="certificates.xlsx",
        mimetype=(
            "application/vnd.openxmlformats-officedocument"
            ".spreadsheetml.sheet"
        )
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
    if cert.number is None:
        counter = (
            db.session.execute(
                db.select(CertificateSeries)
                .where(CertificateSeries.series == cert.series)
                .with_for_update()
            )
            .scalar_one_or_none()
        )

        if counter is None:
            return {
                "error": "Для серии не найден счетчик."
            }, 400
        if counter.last_number >= counter.max_number:
            return {
                "error": "В партии закончились свободные номера."
            }, 400
        counter.last_number += 1
        cert.number = str(counter.last_number)
    # old_data
    old_data = {
        "client_id": cert.client_id,
        "issue_date": cert.issue_date,
        "issue_place_id": cert.issue_place_id,
        "edit_user_id": cert.edit_user_id,
    }    
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
    
    db.session.flush()
    
    audit_update(old_data, cert, comment="Выдача сертификата")
    db.session.commit()

    return {"status": "ok"}


@certificates_bp.route("/certificates/<int:certificate_id>/spend", methods=["POST"])
@login_required
def spend_certificate_route(certificate_id):
    data = request.get_json()
    certificate = db.get_or_404(Certificate, certificate_id)
    client_id = data.get("client_id")
    amount = data.get("amount")
    comment = data.get("comment")
    # ========== Проверка срока действия ==========
    if certificate.expiration_date and certificate.expiration_date < date.today():
        return jsonify({
            "success": False,
            "message": "Срок действия сертификата истёк. Списание невозможно.",
            "expired": True
        }), 400
    # ============================================
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

@certificates_bp.route("/certificates/<int:certificate_id>/transaction", methods=["GET", "POST"])
@login_required
def create_certificate_transaction(certificate_id):
    if request.method == "POST":
        data = request.get_json()
        certificate = db.get_or_404(Certificate, certificate_id)
        # ========== Проверка срока действия ==========
        if certificate.expiration_date and certificate.expiration_date < date.today():
            return jsonify({
                "success": False,
                "message": "Срок действия сертификата истёк. Списание невозможно.",
                "expired": True
            }), 400
        # ============================================
        
        try:
            transaction = create_transaction(
                certificate_id=certificate_id,
                client_id=data["client_id"],
                user_id=current_user.id,
                items=data["items"],
                comment=data.get("comment"),
            )

        except ValueError as e:
            return jsonify({
                "success": False,
                "message": str(e)
            }), 400

        #print(transaction)
        current_app.logger.info(
            "Created transaction %s for certificate %s",
            transaction.id,
            certificate_id
        )
        return jsonify({
            "success": True,
            "transaction_id": transaction.id
        })
    # GET
    transactions = get_certificate_transactions(certificate_id)

    return jsonify([
        {
            "id": tx.id,
            "date": tx.create_date.strftime("%d.%m.%Y %H:%M"),
            "client": (tx.client.full_name if tx.client else ""),
            "user": ( tx.user.name if tx.user else ""),
            "comment": tx.comment or "",
            "amount": str( sum( item.amount for item in tx.items)),
            "items": [
                {
                    "service_name": item.service_name,
                    "quantity": str(item.quantity),
                    "price": str(item.price),
                    "amount": str(item.amount),
                }
                for item in tx.items
            ]
        }
        for tx in transactions
    ])
    
@certificates_bp.route("/certificates/<int:certificate_id>/services", methods=["GET"])
@login_required
def get_certificate_services(certificate_id):
    certificate = db.get_or_404(Certificate, certificate_id)

    # Если у сертификата уже есть связанные услуги — возвращаем их
    if certificate.certificate_services:
        services_list = [
            {
                "id": cs.service.id,
                "name": cs.service.name,
                "code": cs.service.code,
                "is_active": cs.service.is_active,
                "mis_id": cs.service.mis_id
            }
            for cs in certificate.certificate_services
        ]
    else:
        # Иначе возвращаем ВСЕ активные услуги
        all_services = db.session.execute(
            db.select(Services).filter_by(is_active=True)
        ).scalars().all()

        services_list = [
            {
                "id": service.id,
                "name": service.name,
                "code": service.code,
                "is_active": service.is_active,
                "mis_id": service.mis_id
            }
            for service in all_services
        ]

    return jsonify(services_list)
    
@certificates_bp.route("/certificates/<int:certificate_id>", methods=["GET"])
@login_required
def get_certificate_info(certificate_id):
    certificate = db.get_or_404(Certificate, certificate_id)
    
    return jsonify({
        # Основные поля сертификата
        "id": certificate.id,
        "number": certificate.number,
        # Приводим дату к строковому формату ISO, иначе jsonify выдаст ошибку
        "create_date": certificate.create_date.isoformat() if certificate.create_date else None,
        "reason": certificate.reason,
        "series": certificate.series,
        "total_amount": certificate.total_amount,
        "servicegroup_id": certificate.servicegroup_id,
        "user_id": certificate.user_id,
        "place_id": certificate.place_id,
        "mol_id": certificate.mol_id,
        "spending_type": certificate.spending_type,
        "require_original": certificate.require_original,
        "require_stamp": certificate.require_stamp,
        "is_single_use": certificate.is_single_use,
        "max_50_percent": certificate.max_50_percent,

        "expiration_date": certificate.expiration_date.isoformat() if certificate.expiration_date else None,
        "note": certificate.note,
    })

    
@certificates_bp.route( "/certificates/<int:certificate_id>/templates", methods=["GET"])
@login_required
def get_certificate_templates(certificate_id):
    certificate = db.session.get( Certificate, certificate_id)
    if not certificate:
        abort(404)

    versions = (
        db.session.execute(
            db.select(TemplateVersion)
            .join(
                CertificateTemplateLink,
                CertificateTemplateLink.template_version_id
                == TemplateVersion.id
            )
            .where(
                CertificateTemplateLink.certificate_id == certificate_id,
                TemplateVersion.is_active.is_(True)
            )
            .order_by(
                TemplateVersion.template_id,
                TemplateVersion.version
            )
        )
        .scalars()
        .all()
    )

    return jsonify([
        {
            "id": version.id,
            "template_id": version.template_id,
            "name": version.template.name,
            "version": version.version,
            "filename": version.filename,
            "folder_path": version.folder_path,
            "url": url_for(
                "templates.get_template_version_file",
                version_id=version.id
            )
        }
        for version in versions
    ])
    
@certificates_bp.route( "/certificates/<int:certificate_id>/templates", methods=["POST"])
@login_required
def add_certificate_template( certificate_id):
    certificate = db.session.get( Certificate, certificate_id)
    if not certificate:
        abort(404)
    data = request.get_json() or {}
    template_version_id = data.get( "template_version_id")
    if not template_version_id:
        return jsonify({
            "error": "Не указана версия макета"
        }), 400

    version = db.session.get( TemplateVersion, template_version_id)
    if not version:
        return jsonify({
            "error": "Версия макета не найдена"
        }), 404
    if not version.is_active:
        return jsonify({
            "error": "Версия макета отключена"
        }), 400

    existing_link = db.session.execute(
        db.select(CertificateTemplateLink)
        .where(
            CertificateTemplateLink.certificate_id == certificate.id,
            CertificateTemplateLink.template_version_id == version.id
        )
    ).scalar_one_or_none()

    if existing_link:
        return jsonify({
            "error": "Эта версия уже привязана к сертификату"
        }), 409

    link = CertificateTemplateLink( certificate_id=certificate.id, template_version_id=version.id)

    db.session.add(link)
    db.session.commit()

    return jsonify({
        "certificate_id": certificate.id,
        "template_version_id": version.id
    }), 201
    
@certificates_bp.route( "/certificates/<int:certificate_id>/templates/<int:template_version_id>", methods=["DELETE"])
@login_required
def remove_certificate_template( certificate_id, template_version_id):
    link = db.session.execute(
        db.select(CertificateTemplateLink)
        .where(
            CertificateTemplateLink.certificate_id  == certificate_id,
            CertificateTemplateLink.template_version_id == template_version_id
        )
    ).scalar_one_or_none()

    if not link:
        abort(404)

    db.session.delete(link)
    db.session.commit()

    return jsonify({
        "message": "Версия макета отвязана от сертификата"
    }), 200
    
@certificates_bp.route('/export_excel')
@login_required # Если используете flask-login
def export_excel():
    pass