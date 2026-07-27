from flask import Blueprint, current_app, flash, jsonify, redirect, render_template, request, url_for
from flask_login import login_required
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError

from app import db
from app.models import AuditLog, User



reports_bp = Blueprint( "reports",
    __name__,
    url_prefix="/reports"
)


@reports_bp.route("/")
@login_required
def list_reports():
        return render_template("reports/list.html")
    
@reports_bp.route('/audit')
@login_required
def audit_log():
    """Страница журнала аудита"""
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    action_filter = request.args.get('action')
    entity_filter = request.args.get('entity_type')
    user_filter = request.args.get('user_id')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = AuditLog.query.order_by(desc(AuditLog.create_date))

    # Фильтры
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)
    if entity_filter:
        query = query.filter(AuditLog.entity_type == entity_filter)
    if user_filter:
        query = query.filter(AuditLog.user_id == user_filter)
    if date_from:
        query = query.filter(AuditLog.create_date >= date_from)
    if date_to:
        query = query.filter(AuditLog.create_date <= date_to)

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    logs = pagination.items

    # Для фильтров в форме
    users = User.query.filter_by(active=True).all()
    actions = db.session.query(AuditLog.action).distinct().all()
    entities = db.session.query(AuditLog.entity_type).distinct().all()

    return render_template('reports/audit.html', 
                         logs=logs,
                         pagination=pagination,
                         users=users,
                         actions=[a[0] for a in actions],
                         entities=[e[0] for e in entities])
    
@reports_bp.route('/audit/log/<int:log_id>')
@login_required
def get_audit_log(log_id):
    log = AuditLog.query.get_or_404(log_id)
    
    changes = []
    
    if log.old_data and log.new_data:
        for key in log.new_data:
            old_val = log.old_data.get(key)
            new_val = log.new_data.get(key)
            
            if old_val != new_val:
                changes.append({
                    'field': key,
                    'old': old_val,
                    'new': new_val
                })

    return jsonify({
        'id': log.id,
        'created_at': log.create_date.strftime('%d.%m.%Y %H:%M:%S') if log.create_date else None,
        'user_name': log.user.name if log.user else None,
        'action': log.action,
        'entity_type': log.entity_type,
        'entity_id': log.entity_id,
        'old_data': log.old_data,
        'new_data': log.new_data,
        'changes': changes,          # ← новое поле
        'comment': log.comment,
        'ip_address': log.ip_address
    })