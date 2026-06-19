# /app/services/certificate_service.py

from datetime import datetime
from decimal import Decimal
from app import db
from app.models import Certificate, CertificateUsage
from sqlalchemy import func
import re

class CertificateError(Exception):
    pass

def get_certificate_or_404(certificate_id: int) -> Certificate:
    certificate = Certificate.query.get(certificate_id)
    if not certificate:
        raise ValueError("Сертификат не найден")
    return certificate

def spend_certificate(certificate_id: int, amount, user_id: int, comment: str | None = None):
    """
    Списание средств с сертификата

    :param certificate_id: id сертификата
    :param amount: сумма списания
    :param user_id: кто списывает
    :param comment: комментарий
    """

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

    # 3. Создаём запись списания
    usage = CertificateUsage(
        certificate_id=certificate_id,
        amount=amount,
        comment=comment,
        user_id=user_id
    )

    db.session.add(usage)

    # записываем usage в БД, но без commit
    db.session.flush()
    #new_balance = certificate.balance
    # 4. Автоматически выводим из оборота
    if certificate.balance == 0:
        certificate.active = False
        certificate.edit_user_id = user_id

    # 5. Коммит — атомарность операции
    db.session.commit()

    return usage


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
# def use_certificate(*, certificate_id: int, amount: float, user_id: int, comment: str = None):
#     """
#     Списание средств с сертификата
#     """

#     cert = db.session.get(Certificate, certificate_id)

#     if not cert:
#         raise CertificateError("Сертификат не найден")

#     # 1. проверка статуса (должен быть выдан)
#     if not cert.client_id:
#         raise CertificateError("Сертификат не выдан клиенту")

#     # 2. проверка остатка
#     if cert.balance < amount:
#         raise CertificateError("Недостаточно средств на сертификате")

#     # 3. создаём запись списания
#     usage = CertificateUsage(
#         certificate_id=certificate_id,
#         amount=amount,
#         comment=comment,
#         user_id=user_id,
#         created_at=datetime.now()
#     )

#     db.session.add(usage)

#     # 4. (опционально) фиксируем кто правил сертификат
#     cert.edit_user_id = user_id

#     db.session.commit()

#     return usage