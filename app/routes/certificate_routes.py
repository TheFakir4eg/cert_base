# app/routes/certificates_routes.py
from datetime import datetime
from pathlib import Path
import json
from flask import Blueprint, flash, jsonify, redirect, render_template, current_app, request, url_for, abort, send_file
from flask_login import login_required,current_user
#from flask_sqlalchemy import extension
from sqlalchemy import Cast, Integer, func

from app import db
from app.models import Certificate, CertificateSeries, CertificateService, CertificateTemplate, CertificateTemplateLink, CertificateUsage, Client, Place, ServiceGroup, Services, TemplateVersion, User
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
            new_templates_str = new_templates_str,
            deleted_ids_str = deleted_ids_str,
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

@certificates_bp.route("/certificates/<int:certificate_id>/transaction", methods=["GET", "POST"])
@login_required
def create_certificate_transaction(certificate_id):
    if request.method == "POST":
        data = request.get_json()

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
    
# @certificates_bp.route("/certificate-templates/<int:template_id>/file", methods=["GET"])
# @login_required
# def get_certificate_template_file(template_id):
#     template = db.session.get(CertificateTemplate,template_id)

#     if not template: abort(404)
#     if not template.is_active: abort(404)
#     if not template.exists: abort(404)
#     if not template.is_valid_path: abort(404)
    
#     extension = template.full_path.suffix.lower()
#     if extension not in current_app.config["ALLOWED_TEMPLATE_EXTENSIONS"]: abort(404)
    
#     return send_file(
#         template.full_path
#     )
    
# @certificates_bp.route("/certificate-templates/files", methods=["GET"])
# @login_required
# def get_certificate_template_files():
#     base_path = Path(current_app.config[ "CERTIFICATE_TEMPLATES_PATH"])

#     current_app.logger.info( "Путь к макетам: %s", base_path)
#     current_app.logger.info( "Абсолютный путь: %s", base_path.resolve())
#     current_app.logger.info(
#         "Существует: %s, папка: %s",
#         base_path.exists(),
#         base_path.is_dir()
#     )
    
#     if not base_path.exists():
#         return jsonify([])

#     if not base_path.is_dir():
#         return jsonify([])

#     result = []

#     for folder in sorted(base_path.iterdir()):
#         if not folder.is_dir():
#             continue
#         files = []
#         for file in sorted(folder.iterdir()):
#             if not file.is_file():
#                 continue
#             extension = file.suffix.lower()
#             if extension not in current_app.config[ "ALLOWED_TEMPLATE_EXTENSIONS"]:
#                 continue
#             files.append({
#                 "filename": file.name,
#                 "extension": extension,
#                 "is_image": extension in {
#                     ".jpg",
#                     ".jpeg",
#                     ".png",
#                     ".webp"
#                 }
#             })

#         if files:
#             result.append({
#                 "folder": folder.name,
#                 "files": files,
#             })

#     return jsonify(result)

# @certificates_bp.route("/certificates/<int:certificate_id>/templates", methods=["POST"])
# @login_required
# def add_certificate_template(certificate_id):
#     certificate = db.session.get( Certificate, certificate_id)
#     if not certificate:
#         abort(404)
#     data = request.get_json() or {}
#     name = (data.get("name") or "").strip()
#     folder_path = (data.get("folder_path") or "").strip()
#     filename = (data.get("filename") or "").strip()
#     if not name:
#         return jsonify({
#             "error": "Не указано название макета"
#         }), 400
#     if not folder_path:
#         return jsonify({
#             "error": "Не указана папка"
#         }), 400
#     if not filename:
#         return jsonify({
#             "error": "Не указан файл"
#         }), 400
#     base_path = Path( current_app.config[ "CERTIFICATE_TEMPLATES_PATH"]).resolve()
#     folder = ( base_path / folder_path).resolve()
#     file_path = ( folder / filename).resolve()
#     try:
#         folder.relative_to(base_path)
#         file_path.relative_to(base_path)
#     except ValueError:
#         return jsonify({
#             "error": "Недопустимый путь"
#         }), 400
#     if not folder.is_dir():
#         return jsonify({
#             "error": "Папка не существует"
#         }), 400
#     if not file_path.is_file():
#         return jsonify({
#             "error": "Файл не существует"
#         }), 400
#     extension = file_path.suffix.lower()
#     if extension not in current_app.config[ "ALLOWED_TEMPLATE_EXTENSIONS"]:
#         return jsonify({
#             "error": "Тип файла не разрешён"
#         }), 400

#     template = CertificateTemplate(
#         name=name,
#         certificate_id=certificate.id,
#         folder_path=folder_path,
#         filename=filename,
#         user_id=current_user.id,
#     )

#     db.session.add(template)
#     db.session.commit()

#     return jsonify({
#         "id": template.id,
#         "name": template.name,
#         "folder_path": template.folder_path,
#         "filename": template.filename,
#         "sort_order": template.sort_order,
#         "is_active": template.is_active,
#         "url": url_for(
#             "certificates.get_certificate_template_file",
#             template_id=template.id
#         )
#     }), 201
    
# @certificates_bp.route("/certificates/<int:certificate_id>/templates", methods=["GET"])
# @login_required
# def get_certificate_templates(certificate_id):
#     certificate = db.session.get( Certificate, certificate_id)
#     if not certificate:
#         abort(404)

#     templates = (
#         CertificateTemplate.query
#         .filter_by(
#             certificate_id=certificate_id,
#             is_active=True
#         )
#         .order_by(
#             CertificateTemplate.sort_order,
#             CertificateTemplate.id
#         )
#         .all()
#     )
#     all_templates = CertificateTemplate.query.all()

#     current_app.logger.info(
#         "ВСЕ макеты в БД: %s",
#         [
#             {
#                 "id": t.id,
#                 "certificate_id": t.certificate_id,
#                 "name": t.name,
#                 "is_active": t.is_active,
#             }
#             for t in all_templates
#         ]
#     )
#     current_app.logger.info(
#         "Макеты сертификата %s: %s",
#         certificate_id,
#         [
#             {
#                 "id": t.id,
#                 "certificate_id": t.certificate_id,
#                 "name": t.name,
#                 "is_active": t.is_active,
#                 "filename": t.filename,
#             }
#             for t in templates
#         ]
#     )
#     return jsonify([
#         {
#             "id": template.id,
#             "name": template.name,
#             "filename": template.filename,
#             "sort_order": template.sort_order,
#             "url": url_for(
#                 "certificates.get_certificate_template_file",
#                 template_id=template.id
#             )
#         }
#         for template in templates
#     ])
    
# @certificates_bp.route( "/certificate-templates/<int:template_id>", methods=["DELETE"])
# @login_required
# def delete_certificate_template(template_id):
#     success = deactivate_certificate_template(template_id)
    
#     if not success:
#         abort(404) # Или return jsonify({"message": "Не найден"}), 404

#     db.session.commit() # Коммитим здесь, так как это отдельный HTTP-запрос

#     return jsonify({
#         "message": "Макет удалён",
#         "id": template_id
#     }), 200
    
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