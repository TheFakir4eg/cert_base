# app/services/transaction_service.py

from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app import db
from app.models import (
    Certificate,
    CertificateTransaction,
    CertificateTransactionItem,
    Services,
)


# ======================================================================
# Public API
# ======================================================================

# def create_transaction(
#     certificate_id: int,
#     client_id: int | None,
#     user_id: int,
#     items: list[dict],
#     comment: str | None = None,
# ) -> CertificateTransaction:
#     """
#     Создает новую транзакцию списания по сертификату.

#     Алгоритм:
#         1. Блокировка сертификата.
#         2. Проверка возможности списания.
#         3. Создание CertificateTransaction.
#         4. Создание CertificateTransactionItem.
#         5. Проверка остатка.
#         6. Commit.

#     Args:
#         certificate_id: ID сертификата.
#         client_id: ID клиента, получившего услуги.
#         user_id: Пользователь, проводящий операцию.
#         items: Список услуг.

#             [
#                 {
#                     "service_id": 1,
#                     "quantity": Decimal("2")
#                 }
#             ]

#         comment: Комментарий.

#     Returns:
#         CertificateTransaction
#     """
#     certificate = _lock_certificate(certificate_id)

#     validated = validate_transaction( certificate=certificate, items=items,)

#     transaction = CertificateTransaction(
#         certificate=certificate,
#         client_id=client_id,
#         user_id=user_id,
#         comment=comment,
#     )

#     db.session.add(transaction)

#     for item in validated["items"]:
#         transaction.items.append(
#             _create_transaction_item(
#                 service=item["service"],
#                 quantity=item["quantity"],
#                 price=item["price"],
#                 amount=item["amount"],
#             )
#         )
#     if validated["balance_after"] == Decimal("0.00"):
        
#         certificate.active = False

#     try:
#         db.session.commit()
#         print("Успешная транзакция")
#     except:
#         db.session.rollback()
#         raise

#     return transaction
def create_transaction( certificate_id: int, client_id: int | None, user_id: int, items: list[dict], comment: str | None = None,) -> CertificateTransaction:
    """
    Создает новую транзакцию списания по сертификату.

    Commit здесь НЕ выполняется.
    Функция изменяет текущую SQLAlchemy session и делает flush(),
    чтобы получить ID созданной транзакции.

    Args:
        certificate_id: ID сертификата.
        client_id: ID клиента, получившего услуги.
        user_id: Пользователь, проводящий операцию.
        items: Список услуг.

            [
                {
                    "service_id": 1,
                    "quantity": Decimal("2")
                }
            ]

        comment: Комментарий.

    Returns:
        CertificateTransaction
    """

    certificate = _lock_certificate(certificate_id)

    validated = validate_transaction(
        certificate=certificate,
        items=items,
    )

    transaction = CertificateTransaction(
        certificate=certificate,
        client_id=client_id,
        user_id=user_id,
        comment=comment,
    )

    db.session.add(transaction)

    for item in validated["items"]:
        transaction.items.append(
            _create_transaction_item(
                service=item["service"],
                quantity=item["quantity"],
                price=item["price"],
                amount=item["amount"],
            )
        )

    if validated["balance_after"] == Decimal("0.00"):
        certificate.active = False

    # INSERT transaction + items и UPDATE certificate
    # отправляются в БД, transaction.id становится доступен.
    db.session.flush()

    return transaction

def get_certificate_transactions(
    certificate_id: int,
) -> list[CertificateTransaction]:
    """
    Возвращает все транзакции сертификата
    вместе с позициями.
    """

    return (
        db.session.query(CertificateTransaction)
        .options(
            joinedload(CertificateTransaction.items)
            .joinedload(CertificateTransactionItem.service),
            joinedload(CertificateTransaction.client),
            joinedload(CertificateTransaction.user),
        )
        .filter(
            CertificateTransaction.certificate_id == certificate_id
        )
        .order_by(
            CertificateTransaction.create_date.desc()
        )
        .all()
    )


def get_transaction(
    transaction_id: int,
) -> CertificateTransaction | None:
    """
    Возвращает одну транзакцию вместе
    со всеми позициями.
    """

    return (
        db.session.query(CertificateTransaction)
        .options(
            joinedload(CertificateTransaction.items)
            .joinedload(CertificateTransactionItem.service),
            joinedload(CertificateTransaction.client),
            joinedload(CertificateTransaction.user),
        )
        .filter(
            CertificateTransaction.id == transaction_id
        )
        .first()
    )


def calculate_certificate_balance(
    certificate: Certificate,
) -> Decimal:
    """
    Вычисляет текущий остаток сертификата.
    """
    used = (
        db.session.query(
            func.coalesce(
                func.sum(CertificateTransactionItem.amount),
                Decimal("0.00"),
            )
        )
        .join(CertificateTransaction)
        .filter(
            CertificateTransaction.certificate_id == certificate.id
        )
        .scalar()
    )

    #certificate = db.session.get(Certificate, certificate.id)

    return certificate.total_amount - used


# ======================================================================
# Validation
# ======================================================================

def validate_transaction(
    certificate: Certificate,
    items: list[dict],
) -> dict:
    # TODO:
    # заменить dict на dataclass ValidationResult
    """
    Проверяет возможность проведения транзакции.

    Возвращает подготовленные данные для создания транзакции.

    Raises:
        ValueError: если проведение невозможно.
    """

    if not certificate.active:
        raise ValueError("Сертификат выведен из оборота.")

    if certificate.expiration_date and certificate.expiration_date < date.today():
        raise ValueError("Срок действия сертификата истек.")

    if not items:
        raise ValueError("Не выбрано ни одной услуги.")

    validated_items = []
    transaction_amount = Decimal("0.00")

    for item in items:

        service_id = item.get("service_id")
        quantity = Decimal(item.get("quantity", 1))

        if quantity <= 0:
            raise ValueError("Количество услуги должно быть больше нуля.")

        service = db.session.get(
            Services,
            service_id
        )

        if service is None:
            raise ValueError(f"Услуга {service_id} не найдена.")

        if not service.is_active:
            raise ValueError(
                f'Услуга "{service.name}" отключена.'
            )

        price = Decimal(item.get("price", 0))

        if price <= 0:
            raise ValueError(
                f"Не указана стоимость услуги {service.name}"
            )

        amount = _calculate_amount(price,quantity)
        transaction_amount += amount

        validated_items.append(
            {
                "service": service,
                "quantity": quantity,
                "price": price,
                "amount": amount,
            }
        )

    balance = calculate_certificate_balance(certificate)

    remaining = balance - transaction_amount

    if remaining < Decimal("0.00"):
        raise ValueError(
            "Недостаточно средств на сертификате."
        )

    return {
        "items": validated_items,
        "transaction_amount": transaction_amount,
        "balance_before": balance,
        "balance_after": remaining,
    }


# ======================================================================
# Helpers
# ======================================================================

def _create_transaction_item(
    service: Services,
    quantity: Decimal,
    price: Decimal,
    amount: Decimal,
) -> CertificateTransactionItem:
    """
    Создает позицию транзакции на основании услуги.

    В позиции фиксируются snapshot-поля (название услуги и цена),
    чтобы история транзакций не зависела от последующих изменений
    справочника услуг.
    """
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero.")
    
    #amount = _calculate_amount(service.price, quantity)

    return CertificateTransactionItem(
        service=service,
        service_name=service.name,
        price=price,
        quantity=quantity,
        amount=amount,
    )


def _calculate_amount(
    price: Decimal,
    quantity: Decimal,
) -> Decimal:
    """
    Рассчитывает сумму строки документа.

    Пока:

        amount = price * quantity

    В будущем здесь могут появиться
    скидки, коэффициенты, акции и т.д.
    """
    return price * quantity


def _lock_certificate(certificate_id: int) -> Certificate:
    """
    Возвращает сертификат, заблокированный для изменения.

    Используется для предотвращения одновременного проведения
    нескольких транзакций по одному сертификату.
    """

    certificate = (
        db.session.query(Certificate)
        .filter(Certificate.id == certificate_id)
        .with_for_update()
        .first()
    )

    if certificate is None:
        raise ValueError(f"Certificate {certificate_id} not found.")

    return certificate