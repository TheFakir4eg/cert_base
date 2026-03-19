# app/routes/settings_routes.py
from flask import Blueprint, render_template, current_app
from flask_login import login_required
from app import db
from app.models import Group

settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/groups')
@login_required
def list_groups():
    current_app.logger.info("Доступ к списку групп")
    # Получаем все группы из базы данных
    groups = db.session.execute(db.select(Group)).scalars().all()
    return render_template('settings/group_list.html', groups=groups)

@settings_bp.route('/settings')
@login_required
def settings():
    current_app.logger.info("Доступ к странице Настройки")
    return render_template('settings/settings.html')
