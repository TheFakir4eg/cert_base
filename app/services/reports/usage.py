from dataclasses import dataclass
from sqlalchemy.orm import joinedload

from app import db
from app.models import Certificate, CertificateTransaction, CertificateTransactionItem
from app.services.reports.base import BaseReport
from app.services.reports.report_data import (
    ReportData,
    ReportColumn,
    ReportRow,
    ReportSummaryItem,
)

@dataclass(slots=True)
class UsageReportContext:

    items: list[CertificateTransactionItem]
    
class UsageReport(BaseReport):

    title = "Использование сертификатов"

    def build(self, filters):

        context = self._load_context(filters)

        report = ReportData(
            title=self.title,
            filters=filters.to_dict()
        )

        report.columns = self._build_columns()
        report.summary = self._build_summary(context)
        report.rows = self._build_rows(context)

        return report

    def _load_context(self, filters):
        items = self._load_items(filters)

        return UsageReportContext(
            items=items
        )

    def _load_items(self, filters):
        query = (
            db.session.query(CertificateTransactionItem)
            .options(
                joinedload(CertificateTransactionItem.transaction)
                .joinedload(CertificateTransaction.certificate),
                joinedload(CertificateTransactionItem.service),
            )
            .join(CertificateTransaction)
            .join(Certificate)
        )
        if filters.date_from:
            query = query.filter( CertificateTransaction.create_date >= filters.date_from)
        if filters.date_to:
            query = query.filter( CertificateTransaction.create_date <= filters.date_to)
        if filters.series:
            query = query.filter( Certificate.series == filters.series)
        if filters.place_id:
            query = query.filter( Certificate.place_id == filters.place_id)
        if filters.mol_id:
            query = query.filter( Certificate.mol_id == filters.mol_id)
        if filters.client_id:
            query = query.filter( CertificateTransaction.client_id == filters.client_id)
        if filters.servicegroup_id:
            query = query.filter( Certificate.servicegroup_id == filters.servicegroup_id)
        if filters.service_id:
            query = query.filter( CertificateTransactionItem.service_id == filters.service_id)
                    
        return query.all()

    def _build_columns(self):
        return [
            ReportColumn(
                key="operation_date",
                title="Дата",
                data_type="date",
            ),
            ReportColumn(
                key="certificate",
                title="Сертификат",
            ),
            ReportColumn(
                key="client",
                title="Клиент",
            ),
            ReportColumn(
                key="service",
                title="Услуга",
            ),
            ReportColumn(
                key="quantity",
                title="Кол-во",
                data_type="number",
            ),
            ReportColumn(
                key="price",
                title="Цена",
                data_type="money",
            ),
            ReportColumn(
                key="amount",
                title="Сумма",
                data_type="money",
            ),
        ]

    def _build_summary(self, context):
        total_amount = sum(
            item.amount
            for item in context.items
        )

        certificates_count = len({
            item.transaction.certificate_id
            for item in context.items
        })

        services_count = len({
            item.service_id
            for item in context.items
        })

        return [
            ReportSummaryItem(
                label="Операций",
                value=len(context.items),
            ),
            ReportSummaryItem(
                label="Общая сумма",
                value=total_amount,
            ),
            ReportSummaryItem(
                label="Использовано сертификатов",
                value=certificates_count,
            ),
            ReportSummaryItem(
                label="Различных услуг",
                value=services_count,
            ),
        ]

    def _build_rows(self, context):
        pass    