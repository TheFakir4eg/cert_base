# /app/routes/service_group_routes/py

from sqlalchemy.exc import IntegrityError

from flask import Blueprint, request, flash, jsonify, redirect, render_template, current_app, request, url_for
from flask_login import login_required
from app import db
from app.models import Certificate, Group, ServiceGroup, Services, User
from app.utils.permissions import permission_required
from sqlalchemy.orm import joinedload

services_bp = Blueprint('services', __name__)

@services_bp.route('/service_list')
@login_required
def service_list():
    services = (
        Services.query
        .order_by(Services.servicegroup_id, Services.name)
        .all()
    )
    servicegroups = db.session.execute(db.select(ServiceGroup)).scalars().all()
    return render_template('services/service_list.html', services=services, servicegroups=servicegroups)

# марушрут для создания услуг через ajax
@services_bp.post("/services/create")
@login_required
def create_service():
    data = request.get_json()
    name = data["name"].strip()
    servicegroup_id = data["servicegroup_id"]
    if not name:
        return jsonify({
            "success": False,
            "error": "Укажите название услуги"
        }), 400        
    if not servicegroup_id:
        return jsonify({
            "success": False,
            "error": "Укажите группу услуги"
        }), 400       
    try:
        new_service = Services(
            name=name,
            servicegroup_id=data["servicegroup_id"],
            code=data.get("code"),
            mis_id=data.get("mis_id"),
            note=data.get("note"),
            is_active=data.get("is_active", True),
        )

        db.session.add(new_service)
        db.session.commit()
        current_app.logger.info(f"Создана услуга: {new_service.name}")
        return jsonify({
            "success": True,
            "message": "Услуга создана",
            "service": {
                "id": new_service.id,
                "name": new_service.name,
                "code": new_service.code,
                "servicegroup_id": new_service.servicegroup_id,
                "group_name": new_service.servicegroup.name,
                "mis_id": new_service.mis_id,
                "note": new_service.note
            }
        })

    except IntegrityError:
        db.session.rollback()
        return jsonify({
            "success": False,
            "error": "Услуга уже существует"
        }), 400

    except Exception as e:
        db.session.rollback()
        current_app.logger.exception(e)
        return jsonify({
            "success": False,
            "error": "Внутренняя ошибка сервера"
        }), 500
        
# марушрут для редактирования услуг через ajax
@services_bp.post("/services/edit")
@login_required
def edit_service():
    data = request.get_json()
    service_id = data["service_id"].strip()
    name = data["name"].strip()
    servicegroup_id = data["servicegroup_id"]
    if not name:
        return jsonify({
            "success": False,
            "error": "Укажите название услуги"
        }), 400        
    if not servicegroup_id:
        return jsonify({
            "success": False,
            "error": "Укажите группу услуги"
        }), 400
        
    if service_id:
        try:
            srv = db.session.get(Services, int(service_id))

            if srv:
                srv.name = name
                srv.servicegroup_id=data["servicegroup_id"]
                srv.code=data.get("code")
                srv.mis_id=data.get("mis_id")
                srv.note=data.get("note")
                srv.is_active=data.get("is_active", True)

                db.session.commit()

                flash(f'✅ Услуга "{srv.name}" обновлена!', 'success')
                print(srv)
                return jsonify({
                    "success": True,
                    "message": "Услуга обновлена",
                    "service": {
                        "id": srv.id,
                        "name": srv.name,
                        "code": srv.code,
                        "servicegroup_id": srv.servicegroup_id,
                        "group_name": srv.servicegroup.name,
                        "mis_id": srv.mis_id,
                        "note": srv.note
                    }
                })

            else:
                return jsonify({
                    "success": False,
                    "error": "Услуга не найдена"
                }), 404

        except Exception as e:
            db.session.rollback()

            current_app.logger.error(f"Ошибка обновления услуги: {e}")

            return jsonify({
                "success": False,
                "error": str(e)
            }), 500      
    
@services_bp.route("/api/services", methods=["GET"])
@login_required
def get_services():

    group_id = request.args.get("group", type=int)
    active = request.args.get("active", default=1, type=int)

    query = (
        Services.query
        .options(joinedload(Services.servicegroup))
    )

    if active:
        query = query.filter(Services.is_active.is_(True))

    if group_id:
        query = query.filter(
            Services.servicegroup_id == group_id
        )

    services = (
        query
        .order_by(Services.name)
        .all()
    )

    return jsonify([service.to_dict for service in services])

@services_bp.route("/api/servicegroups", methods=["GET"])
@login_required
def get_servicegroups():

    groups = (
        ServiceGroup.query
        .order_by(ServiceGroup.name)
        .all()
    )

    return jsonify([
        group.to_dict()
        for group in groups
    ])