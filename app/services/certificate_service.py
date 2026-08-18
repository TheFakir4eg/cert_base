# /app/services/certificate_service.py

from datetime import datetime
from decimal import Decimal
import json

from dateutil.relativedelta import relativedelta
from flask import current_app, jsonify, request
from flask_login import current_user
from app import db
from app.models import Certificate, CertificateSeries, CertificateService, CertificateTemplate, CertificateTemplateLink, CertificateUsage, Client, TemplateVersion
from sqlalchemy import func
import re
from app.utils.audit import audit_create, audit_update, get_template_links_snapshot

class CertificateError(Exception):
    pass

def get_certificate_or_404(certificate_id: int) -> Certificate:
    certificate = Certificate.query.get(certificate_id)
    if not certificate:
        raise ValueError("Сертификат не найден")
    return certificate

def deactivate_certificate_template(template_id: int) -> bool:
    """
    Деактивирует макет (мягкое удаление). 
    Возвращает True, если успешно, False, если макет не найден или уже удален.
    """
    template = db.session.get(CertificateTemplate, template_id)
    
    if not template:
        return False # Или можно raise ValueError("Макет не найден")
        
    if not template.is_active:
        return True # Уже деактивирован, считаем это успехом (идемпотентность)

    template.is_active = False
    return True

def spend_certificate(certificate_id: int, client_id:int, amount, user_id: int, comment: str | None = None):
    """
    Списание средств с сертификата

    :param certificate_id: id сертификата
    :param amount: сумма списания
    :param user_id: кто списывает
    :param comment: комментарий
    """

    deactivated = False
    # 1. Блокируем сертификат на время операции (очень важно!)
    certificate = (
        db.session.query(Certificate)
        .filter_by(id=certificate_id)
        .with_for_update()
        .first()
    )

    if not certificate:
        raise ValueError("Сертификат не найден")

    amount = Decimal(amount)

    if amount <= 0:
        raise ValueError("Сумма должна быть больше нуля")

    # 2. Проверяем баланс
    if amount > certificate.balance:
        raise ValueError("Недостаточно средств на сертификате")

    # 3. 
    client = Client.query.get(client_id)
    if client is None:
        raise ValueError("Клиент не найден")
    
    # 4. Создаём запись списания
    usage = CertificateUsage(
        certificate_id=certificate_id,
        client_id = client_id,
        amount=amount,
        comment=comment,
        user_id=user_id
    )

    db.session.add(usage)

    # записываем usage в БД, но без commit
    db.session.flush()
    #new_balance = certificate.balance
    # 4. Автоматически выводим из оборота
    # if certificate.balance == 0:
    #     certificate.active = False
    #     certificate.edit_user_id = user_id

    used = (
        db.session.query(func.coalesce(func.sum(CertificateUsage.amount), 0))
        .filter(CertificateUsage.certificate_id == certificate_id)
        .scalar()
    )

    remaining = certificate.total_amount - Decimal(used)

    if remaining == 0:
        certificate.edit_user_id = user_id
        certificate.active = False
        deactivated = True
    # 5. Коммит — атомарность операции
    db.session.commit()

    return usage, deactivated


def get_certificate_usages(certificate_id: int):
    usages = (
        CertificateUsage.query
        .filter_by(certificate_id=certificate_id)
        .order_by(CertificateUsage.created_at.desc())
        .all()
    )

    result = []
    for u in usages:
        result.append({
            "date": u.created_at.strftime("%d.%m.%Y %H:%M"),
            "amount": float(u.amount),
            "user": u.user.name,
            "comment": u.comment or ""
        })

    return result

def validate_certificate_series(series: str, total_amount) -> str | None:
    """
    Возвращает текст ошибки или None.
    """

    numbers = re.findall(r"\d+", series or "")

    if not numbers:
        return (
            "Серия должна содержать номинал "
            "(например: ДОНПОД1000)"
        )

    series_amount = int(numbers[-1])

    if series_amount != Decimal(total_amount):
        return (
            f"Номинал в серии ({series_amount}) "
            f"не соответствует номиналу сертификата ({total_amount})"
        )

    return None

def parse_templates(templates_str: str | None) -> list:
    if not templates_str:
        return []
    try:
        templates = json.loads(templates_str)
        if len(templates) == 0:
            current_app.logger.info("Макеты отсутствуют")
            return []
        else: 
            current_app.logger.info(f"Распаршено шаблонов: {len(templates)}")
            return templates
    except json.JSONDecodeError as e:
        current_app.logger.error(f"Ошибка парсинга templates: {e}")
        raise ValueError("Неверный формат шаблонов")
    
def get_expiration_date(form_data):
    """Определение срока действия"""
    expiration_type = form_data.get('expiration_type')
    
    if expiration_type == 'unlimited':
        return None
    elif expiration_type == 'date':
        return datetime.strptime(form_data.get('expiration_date'), '%Y-%m-%d').date()
    elif expiration_type == 'months':
        months = int(form_data.get('expiration_months'))
        return datetime.now().date() + relativedelta(months=months)
    return None


def create_single_certificate(form_data, templates: list, expiration_value, user_id: int):
    reason = form_data.get('reason')
    series = form_data.get('series')
    number = form_data.get('number')
    place_id = int(form_data.get('place_id')) if form_data.get('place_id') else None
    mol_id = int(form_data.get('mol_id')) if form_data.get('mol_id') else None
    spending_type = form_data.get('spending_type')
    service_ids = form_data.getlist('service_ids')
    require_original = form_data.get('require_original') is not None
    require_stamp = form_data.get('require_stamp') is not None
    is_single_use = form_data.get('is_single_use') is not None
    max_50_percent = form_data.get('max_50_percent') is not None
    total_amount = form_data.get('total_amount')
    servicegroup_id_str = form_data.get('servicegroup_id')
    note = form_data.get('note')
    # Конвертируем ID
    servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None
    
    existing_cert = db.session.execute(
        db.select(Certificate).where(
            Certificate.series == series,
            Certificate.number == number
        )
    ).scalar_one_or_none()
    
    # проверяем существование сертификата с полученными данными (серия и номер) 
    if existing_cert:
        raise ValueError("Сертификат с такой серией и номером уже существует")
        
    # проверка серии и номинала
    validation_error = validate_certificate_series(series, total_amount)
    if validation_error:
        raise ValueError(validation_error)
    
    if spending_type == "count" and not service_ids:
        raise ValueError("Для сертификата с учетом в единицах необходимо выбрать услуги")
        
    try:
        # Конвертируем дату (если указана)
        create_date = datetime.now()

        
        
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
        #db.session.commit()
        db.session.flush()
        
        # Добавляем версии макетов к сертификату
        for template_data in templates:
            template_version_id = template_data.get("template_version_id")
            
            if not template_version_id:
                raise ValueError("Не указана версия макета")
            
            template_version = db.session.get( TemplateVersion, int(template_version_id))
            
            if not template_version:
                raise ValueError( f"Версия макета с ID {template_version_id} не найдена")
            if not template_version.is_active:
                raise ValueError( f"Версия макета {template_version.version} " f"не является активной")

            link = CertificateTemplateLink( certificate_id=new_cert.id, template_version_id=template_version.id,)
            db.session.add(link)
        
        # добавляем услуги (при наличии)    
        if spending_type == "count":
            for service_id in service_ids:
                db.session.add(CertificateService(certificate_id=new_cert.id,service_id=int(service_id))) 
        extra = {
            "templates": [
                {
                    "template_version_id": t.get("template_version_id"),
                    "name": t.get("name"),
                    "folder_path": t.get("folder_path"),
                    "filename": t.get("filename"),
                }
                for t in templates
            ],
            "service_ids": [int(sid) for sid in service_ids if sid and str(sid).strip()]
                        if spending_type == "count" else [],
        }       
        audit_create(new_cert, extra_data=extra, comment="Создание сертификата")
        db.session.commit()

        current_app.logger.info("=== CREATE CERTIFICATE ===")
        # отладочная информация (полные денные по сертификату)
        for key, value in form_data.items():
            current_app.logger.info(f"{key}: {value}")
            
        return new_cert

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Ошибка создания сертификата: {e}")
        raise

def bulk_create_certificates(form_data, templates: list, expiration_value, user_id: int) -> int:
    """
    Массовое создание сертификатов.
    Возвращает количество созданных сертификатов.
    """
    reason = form_data.get('reason')
    series = form_data.get('series')
    place_id = int(form_data.get('place_id')) if form_data.get('place_id') else None
    mol_id = int(form_data.get('mol_id')) if form_data.get('mol_id') else None
    spending_type = form_data.get('spending_type')
    service_ids = form_data.getlist('service_ids')
    require_original = form_data.get('require_original') is not None
    require_stamp = form_data.get('require_stamp') is not None
    is_single_use = form_data.get('is_single_use') is not None
    max_50_percent = form_data.get('max_50_percent') is not None
    total_amount = form_data.get('total_amount')
    servicegroup_id_str = form_data.get('servicegroup_id')
    note = form_data.get('note')
    without_numbers = form_data.get("notnumber") is not None
    qty = int(form_data.get("notnumber-qty")) if form_data.get("notnumber-qty") else None

    servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None

    current_app.logger.info("=== BULK CREATE CERTIFICATES ===")
    current_app.logger.info(f"Серия: {series}, Без номеров: {without_numbers}, Пользователь: {user_id}")

    # ========== Валидация ==========
    if spending_type == "count" and not service_ids:
        raise ValueError("Для сертификата с учетом в единицах необходимо выбрать услуги")

    validation_error = validate_certificate_series(series, total_amount)
    if validation_error:
        raise ValueError(validation_error)

    # Определяем номера
    if not without_numbers:
        start = int(form_data.get("first_number"))
        end = int(form_data.get("last_number"))
        numbers = [str(i) for i in range(start, end + 1)]

        if end - start > 500:
            raise ValueError("Слишком большой диапазон")

        existing = db.session.execute(
            db.select(Certificate.number).where(
                Certificate.series == series,
                Certificate.number.in_(numbers)
            )
        ).all()
        if existing:
            raise ValueError("В выбранном диапазоне уже существуют сертификаты")
    else:
        if qty is None or qty <= 0:
            raise ValueError("Количество должно быть больше нуля.")
        if qty > 500:
            raise ValueError("Слишком большое количество")
        numbers = [None] * qty

        existing_series = db.session.execute(
            db.select(Certificate.id).where(Certificate.series == series).limit(1)
        ).scalar()
        if existing_series:
            raise ValueError("В указанной серии уже существуют сертификаты")

    # ========== Валидация версий макетов (один раз на всю пачку) ==========
    validated_versions = []
    for template_data in templates:
        template_version_id = template_data.get("template_version_id")
        if not template_version_id:
            raise ValueError("Не указана версия макета")

        template_version = db.session.get(TemplateVersion, int(template_version_id))
        if not template_version:
            raise ValueError(f"Версия макета с ID {template_version_id} не найдена")
        if not template_version.is_active:
            raise ValueError(
                f"Версия макета {template_version.version} не является активной"
            )
        validated_versions.append(template_version)

    # ========== Создание ==========
    try:
        create_date = datetime.now()
        certs = []

        for num in numbers:
            certs.append(Certificate(
                number=num,
                create_date=create_date,
                reason=reason,
                series=series,
                total_amount=total_amount,
                servicegroup_id=servicegroup_id,
                user_id=user_id,
                place_id=place_id,
                mol_id=mol_id,
                spending_type=spending_type,
                require_original=require_original,
                require_stamp=require_stamp,
                is_single_use=is_single_use,
                max_50_percent=max_50_percent,
                expiration_date=expiration_value,
                note=note
            ))

        if without_numbers:
            db.session.add(CertificateSeries(series=series, max_number=qty))

        db.session.add_all(certs)
        db.session.flush()

        # Услуги
        service_ids_clean = []
        if spending_type == "count":
            service_ids_clean = [
                int(sid) for sid in service_ids if sid and str(sid).strip()
            ]
            for cert in certs:
                for service_id in service_ids_clean:
                    db.session.add(CertificateService(
                        certificate_id=cert.id,
                        service_id=service_id
                    ))

        # Макеты (новая схема)
        for cert in certs:
            for template_version in validated_versions:
                db.session.add(CertificateTemplateLink(
                    certificate_id=cert.id,
                    template_version_id=template_version.id,
                ))

        db.session.flush()

        # ====================== АУДИТ ======================
        from app.utils.audit import audit_create

        templates_extra = [
            {
                "template_version_id": tv.id,
                "version": getattr(tv, "version", None),
                "name": getattr(tv, "name", None),
            }
            for tv in validated_versions
        ]

        if without_numbers:
            audit_comment = (
                f"Массовое создание {len(certs)} безномерных сертификатов "
                f"серии {series} (qty={qty})"
            )
        else:
            first_num = numbers[0] if numbers else None
            last_num = numbers[-1] if numbers else None
            audit_comment = (
                f"Массовое создание {len(certs)} сертификатов "
                f"серии {series} ({first_num}—{last_num})"
            )

        extra = {
            "service_ids": service_ids_clean,
            "templates": templates_extra,
        }

        for cert in certs:
            audit_create(cert, extra_data=extra, comment=audit_comment)
        # ===================================================

        db.session.commit()

        count = len(certs)
        current_app.logger.info(f"✅ Успешно создано {count} сертификатов серии {series}")
        return count

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"❌ Ошибка массового создания сертификатов: {e}")
        raise

# def bulk_create_certificates(form_data, templates: list, expiration_value, user_id: int) -> int:
#     """
#     Массовое создание сертификатов.
#     Возвращает количество созданных сертификатов.
#     """
#     reason = form_data.get('reason')
#     series = form_data.get('series')
#     place_id = int(form_data.get('place_id')) if form_data.get('place_id') else None
#     mol_id = int(form_data.get('mol_id')) if form_data.get('mol_id') else None
#     spending_type = form_data.get('spending_type')
#     service_ids = form_data.getlist('service_ids')
#     require_original = form_data.get('require_original') is not None
#     require_stamp = form_data.get('require_stamp') is not None
#     is_single_use = form_data.get('is_single_use') is not None
#     max_50_percent = form_data.get('max_50_percent') is not None
#     total_amount = form_data.get('total_amount')
#     servicegroup_id_str = form_data.get('servicegroup_id')
#     note = form_data.get('note')
#     without_numbers = form_data.get("notnumber") is not None
#     qty = int(form_data.get("notnumber-qty")) if form_data.get("notnumber-qty") else None

#     servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None

#     # ========== Отладочное логирование ==========
#     current_app.logger.info("=== BULK CREATE CERTIFICATES ===")
#     current_app.logger.info(f"Серия: {series}, Без номеров: {without_numbers}, Пользователь: {user_id}")

#     # ========== Валидация ==========
#     if spending_type == "count" and not service_ids:
#         raise ValueError("Для сертификата с учетом в единицах необходимо выбрать услуги")

#     validation_error = validate_certificate_series(series, total_amount)
#     if validation_error:
#         raise ValueError(validation_error)

#     # Определяем номера
#     if not without_numbers:
#         start = int(form_data.get("first_number"))
#         end = int(form_data.get("last_number"))
#         numbers = [str(i) for i in range(start, end + 1)]

#         if end - start > 500:
#             raise ValueError("Слишком большой диапазон")

#         # Проверка существующих сертификатов
#         existing = db.session.execute(
#             db.select(Certificate.number)
#             .where(
#                 Certificate.series == series,
#                 Certificate.number.in_(numbers)
#             )
#         ).all()

#         if existing:
#             raise ValueError("В выбранном диапазоне уже существуют сертификаты")
#     else:
#         if qty is None or qty <= 0:
#             raise ValueError("Количество должно быть больше нуля.")
#         if qty > 500:
#             raise ValueError("Слишком большое количество")
#         numbers = [None] * qty

#         # Проверка серии для безномерных
#         existing_series = db.session.execute(
#             db.select(Certificate.id).where(Certificate.series == series).limit(1)
#         ).scalar()
#         if existing_series:
#             raise ValueError("В указанной серии уже существуют сертификаты")

#     # ========== Создание ==========
#     try:
#         create_date = datetime.now()
#         certs = []

#         for num in numbers:
#             certs.append(Certificate(
#                 number=num,
#                 create_date=create_date,
#                 reason=reason,
#                 series=series,
#                 total_amount=total_amount,
#                 servicegroup_id=servicegroup_id,
#                 user_id=user_id,
#                 place_id=place_id,
#                 mol_id=mol_id,
#                 spending_type=spending_type,
#                 require_original=require_original,
#                 require_stamp=require_stamp,
#                 is_single_use=is_single_use,
#                 max_50_percent=max_50_percent,
#                 expiration_date=expiration_value,
#                 note=note
#             ))

#         # Добавляем серию для безномерных
#         if without_numbers:
#             db.session.add(CertificateSeries(series=series, max_number=qty))

#         db.session.add_all(certs)
#         db.session.flush()

#         # Добавляем услуги
#         if spending_type == "count":
#             for cert in certs:
#                 for service_id in service_ids:
#                     if service_id and service_id.strip():
#                         db.session.add(
#                             CertificateService(
#                                 certificate_id=cert.id,
#                                 service_id=int(service_id)
#                             )
#                         )
#         # добавляем макет 
#         for cert in certs:
#             for template_data in templates:
#                 template = CertificateTemplate(
#                     certificate_id=cert.id,
#                     name=template_data["name"],
#                     folder_path=template_data["folder_path"],
#                     filename=template_data["filename"],
#                     user_id=user_id,
#                 )
#                 db.session.add(template)
#         # аудит
#         if without_numbers:
#             audit_comment = (
#                 f"Массовое создание {len(certs)} безномерных сертификатов "
#                 f"серии {series} (qty={qty})"
#             )
#         else:
#             audit_comment = (
#                 f"Массовое создание {len(certs)} сертификатов "
#                 f"серии {series} (с номерами {numbers[0] if numbers else ''}..{numbers[-1] if numbers else ''})"
#             )
#         for cert in certs:
#             audit_create(cert, comment=audit_comment)
                  
#         db.session.commit()

#         count = len(certs)
#         current_app.logger.info(f"✅ Успешно создано {count} сертификатов серии {series}")
#         return count

#     except Exception as e:
#         db.session.rollback()
#         current_app.logger.error(f"❌ Ошибка массового создания сертификатов: {e}")
#         raise
    
def update_certificate(form_data, new_templates_data: list, deleted_template_ids: list, expiration_value, user_id: int):
    """
    Обновление существующего сертификата.
    """
    print(form_data)
    cert_id_str = form_data.get('cert_id')
    if not cert_id_str:
        raise ValueError("Не указан ID сертификата")

    cert = db.session.get(Certificate, int(cert_id_str))
    if not cert:
        raise ValueError("Сертификат не найден")
    # ========== Сохраняем старые данные для аудита ==========
    old_data = {
        "series": cert.series,
        "number": cert.number,
        "reason": cert.reason,
        "total_amount": float(cert.total_amount) if cert.total_amount else None,
        "place_id": cert.place_id,
        "mol_id": cert.mol_id,
        "spending_type": cert.spending_type,
        "require_original": cert.require_original,
        "require_stamp": cert.require_stamp,
        "is_single_use": cert.is_single_use,
        "max_50_percent": cert.max_50_percent,
        "expiration_date": cert.expiration_date.isoformat() if cert.expiration_date else None,
        "note": cert.note,
        "servicegroup_id": cert.servicegroup_id,
        "edit_user_id": cert.edit_user_id,
        "service_ids": sorted([cs.service_id for cs in cert.certificate_services]),
        "template_links": get_template_links_snapshot(cert),
    }
    # ======================================================
    # ========== Извлечение данных ==========
    reason = form_data.get('reason')
    series = form_data.get('series')
    number = form_data.get('number')
    place_id = int(form_data.get('place_id')) if form_data.get('place_id') else None
    mol_id = int(form_data.get('mol_id')) if form_data.get('mol_id') else None
    spending_type = form_data.get('spending_type')
    require_original = form_data.get('require_original') is not None
    require_stamp = form_data.get('require_stamp') is not None
    is_single_use = form_data.get('is_single_use') is not None
    max_50_percent = form_data.get('max_50_percent') is not None
    total_amount = form_data.get('total_amount')
    servicegroup_id_str = form_data.get('servicegroup_id')
    note = form_data.get('note')
    service_ids = form_data.getlist('service_ids')

    servicegroup_id = int(servicegroup_id_str) if servicegroup_id_str else None

    # ========== Валидация ==========
    existing_cert = db.session.execute(
        db.select(Certificate).where(
            Certificate.series == series,
            Certificate.number == number,
            Certificate.id != cert.id
        )
    ).scalar_one_or_none()

    if existing_cert:
        raise ValueError("Сертификат с такой серией и номером уже существует")

    validation_error = validate_certificate_series(series, total_amount)
    if validation_error:
        raise ValueError(validation_error)

    # ========== Обновление ==========
    try:
        edit_date = datetime.now()

        cert.number = number
        cert.edit_date = edit_date
        cert.reason = reason
        cert.series = series
        cert.total_amount = total_amount
        cert.place_id = place_id
        cert.mol_id = mol_id
        cert.spending_type = spending_type
        cert.require_original = require_original
        cert.require_stamp = require_stamp
        cert.is_single_use = is_single_use
        cert.max_50_percent = max_50_percent
        cert.expiration_date = expiration_value
        cert.note = note
        cert.servicegroup_id = servicegroup_id
        cert.edit_user_id = user_id

        # Обновление услуг (при типе "count")
        if spending_type == "count":
            existing_service_ids = {cs.service_id for cs in cert.certificate_services}
            new_service_ids = {int(sid) for sid in service_ids if sid.strip()}

            # Добавляем новые
            for service_id in (new_service_ids - existing_service_ids):
                db.session.add(
                    CertificateService(
                        certificate_id=cert.id,
                        service_id=service_id
                    )
                )
        # 3. Обработка удаления макетов (Templates)
        if deleted_template_ids:
            for tpl in deleted_template_ids:
                deactivate_certificate_template(int(tpl))

        # 4. Обработка добавления новых макетов (Pending Templates)
        for template_data in new_templates_data:
            new_tpl = CertificateTemplate(
                certificate_id=cert.id,
                name=template_data["name"],
                folder_path=template_data["folder_path"],
                filename=template_data["filename"],
                user_id=user_id,
            )
            db.session.add(new_tpl)
        db.session.flush()   # чтобы relationship и id были актуальны
        # ====================== АУДИТ ======================
        extra_new = {
            "service_ids": sorted([cs.service_id for cs in cert.certificate_services]),
            "template_links": get_template_links_snapshot(cert),
            # опционально — что именно меняли в этом запросе
            "templates_added": new_templates_data,          # как пришло с формы
            "templates_deleted": deleted_template_ids or [],
        }

        audit_update(
            old_data=old_data,
            obj=cert,
            extra_data=extra_new,
            comment="Обновление сертификата"
        )

        # ===================================================    
        db.session.commit()

        current_app.logger.info(f"✅ Обновлён сертификат ID={cert.id} ({series}-{number})")
        return cert

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"❌ Ошибка обновления сертификата ID={cert_id_str}: {e}")
        raise