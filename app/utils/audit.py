# app/utils/audit.py
from flask import request, current_app
from flask_login import current_user
from sqlalchemy import event
from datetime import date, datetime
import json
from decimal import Decimal
from uuid import UUID
from enum import Enum
from sqlalchemy import inspect

# def json_serializable(obj):
#     """Преобразует datetime и другие несериализуемые типы в JSON"""
#     if isinstance(obj, datetime):
#         return obj.isoformat()
#     if isinstance(obj, (list, tuple)):
#         return [json_serializable(item) for item in obj]
#     if isinstance(obj, dict):
#         return {k: json_serializable(v) for k, v in obj.items()}
#     return obj
def json_serializable(value):
    """
    Рекурсивно приводит данные к JSON-совместимому виду.
    """
    if value is None:
        return None

    if isinstance(value, (str, int, float, bool)):
        return value

    if isinstance(value, dict):
        return {
            str(k): json_serializable(v)
            for k, v in value.items()
        }

    if isinstance(value, (list, tuple, set)):
        return [
            json_serializable(item)
            for item in value
        ]

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, date):
        return value.isoformat()

    if isinstance(value, Decimal):
        return str(value)

    if isinstance(value, UUID):
        return str(value)

    if isinstance(value, Enum):
        return value.value

    # Если случайно прилетел ORM-объект или другой сложный объект,
    # лучше не тащить его целиком в JSON.
    if hasattr(value, "__tablename__"):
        return getattr(value, "id", str(value))

    if hasattr(value, "to_dict"):
        return json_serializable(value.to_dict())

    return str(value)

def model_to_audit_dict(obj, exclude=None):
    """
    Возвращает только колонки SQLAlchemy-модели,
    без связей и служебных атрибутов.
    """
    exclude = set(exclude or ())

    try:
        mapper = inspect(obj).mapper
    except Exception:
        return {}

    data = {}

    for column_attr in mapper.column_attrs:
        key = column_attr.key

        if key.startswith("_"):
            continue

        if key in exclude:
            continue

        data[key] = getattr(obj, key, None)

    return data

def get_db():
    from app import db
    return db

def get_auditlog_model():
    """Ленивый импорт модели, чтобы избежать circular import"""
    from app.models import AuditLog
    return AuditLog


def get_client_info():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    return {
        'ip_address': ip,
        'user_agent': request.headers.get('User-Agent')
    }


def log_action(
    action: str,
    entity_type: str,
    entity_id: int = None,
    old_data: dict = None,
    new_data: dict = None,
    place_id: int = None,
    comment: str = None
):
    if not current_user or not getattr(current_user, 'is_authenticated', False):
        return

    try:
        db = get_db()
        AuditLog = get_auditlog_model()
        
        client_info = get_client_info()

        log_entry = AuditLog(
            user_id=current_user.id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_data=old_data,
            new_data=new_data,
            place_id=place_id,
            comment=comment,
            ip_address=client_info['ip_address'],
            user_agent=client_info['user_agent']
        )
        
        db.session.add(log_entry)
    except Exception as e:
        current_app.logger.error(f"Failed to create audit log: {e}")


# ====================== Listeners ======================

def create_audit_listener(model_class, action_name):
    def listener(mapper, connection, target):
        try:
            entity_id = getattr(target, 'id', None)
            place_id = (getattr(target, 'place_id', None) or 
                       getattr(target, 'issue_place_id', None) or 
                       getattr(target, 'creating_place_id', None))
            
            log_action(
                action=action_name,
                entity_type=model_class.__name__,
                entity_id=entity_id,
                place_id=place_id
            )
        except Exception as e:
            current_app.logger.error(f"Audit listener error: {e}")

    return listener


def register_audit_listeners():
    """Вызывать только внутри app_context"""
    from app.models import User, Certificate, Client, CertificateTransaction, \
                         CertificateTransactionItem, CertificateUsage, Group

    models_to_track = [User, Certificate, Client, CertificateTransaction,
                       CertificateTransactionItem, CertificateUsage, Group]

    for model in models_to_track:
        try:
            event.listen(model, 'after_insert', create_audit_listener(model, 'create'))
            event.listen(model, 'after_update', create_audit_listener(model, 'update'))
            event.listen(model, 'after_delete', create_audit_listener(model, 'delete'))
            current_app.logger.info(f"✅ Audit listener for {model.__name__}")
        except Exception as e:
            current_app.logger.error(f"❌ Listener registration failed for {model.__name__}: {e}")
            
def audit_create(obj, extra_data=None, comment=None):
    """Логирование создания объекта"""
    if not obj or not hasattr(obj, "id"):
        return

    try:
        # Берём только колонки модели
        data = model_to_audit_dict(
            obj,
            exclude={"password_hash"}
        )

        # Добавляем дополнительные данные
        if extra_data:
            data.update(extra_data)

        # Приводим всё к JSON-совместимому виду
        clean_data = json_serializable(data)

        # Дополнительно проверяем, что payload реально сериализуется
        json.dumps(clean_data, ensure_ascii=False)

        log_action(
            action="create",
            entity_type=obj.__class__.__name__,
            entity_id=obj.id,
            new_data=clean_data,
            comment=comment
        )

    except Exception:
        current_app.logger.exception("Ошибка в audit_create")


# def audit_update(old_data, obj, comment=None):
#     """Для обновления"""
#     log_action(
#         action='update',
#         entity_type=obj.__class__.__name__,
#         entity_id=obj.id,
#         old_data=old_data,
#         new_data={k: getattr(obj, k) for k in old_data.keys()},
#         comment=comment
#     )

def audit_update(old_data: dict, obj, extra_data=None, comment=None):
    """Логирование обновления объекта"""
    if not obj or not old_data:
        return

    try:
        # Новые значения по ключам из old_data
        new_data = {}
        for key in old_data.keys():
            try:
                new_data[key] = getattr(obj, key)
            except AttributeError:
                new_data[key] = None

        # Дополняем связанными данными (услуги, макеты и т.д.)
        if extra_data:
            # Если в old_data тоже есть связанные ключи — оставляем как есть
            # а в new_data добавляем актуальные
            new_data.update(extra_data)

        clean_old = json_serializable(old_data)
        clean_new = json_serializable(new_data)

        log_action(
            action='update',
            entity_type=obj.__class__.__name__,
            entity_id=getattr(obj, 'id', None),
            old_data=clean_old,
            new_data=clean_new,
            comment=comment
        )
    except Exception as e:
        current_app.logger.error(f"Ошибка в audit_update: {e}")
        
def get_template_links_snapshot(cert):
    """Снимок текущих связей сертификата с версиями макетов"""
    result = []
    for link in cert.template_links:
        tv = link.template_version  # relationship
        result.append({
            "link_id": link.id,
            "template_version_id": link.template_version_id,
            "version": getattr(tv, "version", None) if tv else None,
            "name": getattr(tv, "name", None) if tv else None,  # если есть
            "is_active": getattr(tv, "is_active", None) if tv else None,
        })
    return result