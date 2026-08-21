# /app/services/reports/movement.py

from dataclasses import dataclass
from collections import defaultdict
from sqlalchemy.orm import selectinload
from decimal import Decimal

from app import db
from app.models import (
    Certificate,
    CertificateTransaction,
    CertificateTransactionItem,
)
from app.services.reports.base import BaseReport
from app.services.reports.report_data import (
    ReportData,
    ReportColumn,
    ReportRow,
    ReportSummaryItem,
)

@dataclass(slots=True)
class MovementReportContext:
    certificates: list[Certificate]
    transactions: dict[
        int,
        list[CertificateTransaction]
    ]
    items: dict[
        int,
        list[CertificateTransactionItem]
    ]
    
class MovementReport(BaseReport):
    title = "Движение сертификатов"
    slug = None
    
    def build(self, filters):
        context = self._load_context(filters)
        report = ReportData( title=self.title, filters=filters.to_dict())
        report.columns = self._build_columns()
        report.summary = self._build_summary(context)
        report.rows = self._build_rows(context)
        return report
    
    def _load_context(self, filters):
        certificates = self._load_certificates(filters)
        certificate_ids = [
            certificate.id
            for certificate in certificates
        ]

        transactions = self._load_transactions( certificate_ids)
        items = self._load_transaction_items( transactions)

        return MovementReportContext(
            certificates=certificates,
            transactions=transactions,
            items=items
        )

    def _load_certificates(self, filters):
        query = db.session.query(Certificate)
        if filters.date_from:
            query = query.filter( Certificate.issue_date >= filters.date_from)
        if filters.date_to:
            query = query.filter( Certificate.issue_date <= filters.date_to)
        if filters.series:
            query = query.filter( Certificate.series == filters.series)
        if filters.place_id:
            query = query.filter( Certificate.place_id == filters.place_id)
        if filters.mol_id:
            query = query.filter( Certificate.mol_id == filters.mol_id)
        if filters.status is not None:
            if filters.status == "true":
                query = query.filter( Certificate.active.is_(True))
            elif filters.status == "false":
                query = query.filter( Certificate.active.is_(False))
        return query.all()

    def _load_transactions(self, certificate_ids):
        transactions_map = defaultdict(list)

        if not certificate_ids:
            return transactions_map

        transactions = (
            db.session.query(CertificateTransaction)
            .options(
                selectinload(
                    CertificateTransaction.items
                )
            )
            .filter(
                CertificateTransaction.certificate_id.in_(certificate_ids)
            )
            .all()
        )

        for transaction in transactions:
            transactions_map[transaction.certificate_id].append(
                transaction
            )

        return transactions_map

    def _load_transaction_items(self, transactions):
        items_map = defaultdict(list)
        for transaction_list in transactions.values():
            for transaction in transaction_list:
                for item in transaction.items:
                    items_map[ transaction.certificate_id].append(item)
        return items_map

    def _build_columns(self):
        return [
            ReportColumn(
                key="certificate",
                title="Сертификат",
            ),
            ReportColumn(
                key="client",
                title="Держатель",
            ),
            ReportColumn(
                key="issue_date",
                title="Дата выдачи",
                data_type="date",
            ),
            ReportColumn(
                key="nominal",
                title="Номинал",
                data_type="money",
            ),
            ReportColumn(
                key="spent",
                title="Использовано",
                data_type="money",
            ),
            ReportColumn(
                key="balance",
                title="Остаток",
                data_type="money",
            ),
            ReportColumn(
                key="status",
                title="Статус",
            ),
        ]

    def _build_summary(self, context):

        certificates_count = len( context.certificates)

        total_amount = sum(
            certificate.total_amount
            for certificate in context.certificates
        )

        spent_amount = sum(
            item.amount
            for items in context.items.values()
            for item in items
        )

        balance_amount = ( total_amount - spent_amount)

        return [
            ReportSummaryItem(
                label="Количество сертификатов",
                value=certificates_count,
            ),

            ReportSummaryItem(
                label="Общий номинал",
                value=total_amount,
            ),

            ReportSummaryItem(
                label="Использовано",
                value=spent_amount,
            ),

            ReportSummaryItem(
                label="Остаток",
                value=balance_amount,
            ),
        ]

    def _build_rows(self, context):

        rows = []

        for certificate in context.certificates:
            items = context.items.get(
                certificate.id,
                []
            )
            spent = sum( item.amount for item in items)
            balance = certificate.total_amount - spent
            row = ReportRow(
                values={
                    "certificate": (
                        f"{certificate.series} "
                        f"{certificate.display_number}"
                    ),

                    "client": (
                        certificate.holder.name
                        if certificate.holder
                        else ""
                    ),
                    "issue_date": certificate.issue_date,
                    "nominal": certificate.total_amount,
                    "spent": spent,
                    "balance": balance,
                    "status": (
                        "Активен"
                        if certificate.active
                        else "Неактивен"
                    ),
                }
            )

            row.children = self._build_transaction_rows(
                certificate.id,
                context
            )

            rows.append(row)

        return rows
    
    def _build_transaction_rows(
            self,
            certificate_id,
            context
    ):
        rows = []

        items = context.items.get(
            certificate_id,
            []
        )

        for item in items:

            rows.append(
                ReportRow(
                    values={
                        "service": item.service_name,
                        "quantity": item.quantity,
                        "price": item.price,
                        "amount": item.amount,
                    },
                    row_type="detail"
                )
            )

        return rows