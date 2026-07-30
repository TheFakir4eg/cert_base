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
class RegistryReportContext:

    certificates: list[Certificate]
    
class RegistryReport(BaseReport):

    title = "Реестр сертификатов"

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
        certificates = self._load_certificates(filters)
        return RegistryReportContext( certificates=certificates)
    
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
        if filters.client_id:
            query = query.filter( Certificate.client_id == filters.client_id)
        if filters.status == "true":
            query = query.filter( Certificate.active.is_(True))
        elif filters.status == "false":
            query = query.filter( Certificate.active.is_(False))

        return query.all()
    
    def _build_columns(self):
        return [
            ReportColumn( key="certificate", title="Сертификат",),
            ReportColumn( key="client", title="Клиент",),
            ReportColumn( key="issue_date", title="Дата выдачи", data_type="date",),
            ReportColumn( key="expiration_date", title="Действует до", data_type="date",),
            ReportColumn( key="nominal", title="Номинал", data_type="money",),
            ReportColumn( key="spent", title="Использовано", data_type="money",),
            ReportColumn( key="balance", title="Остаток", data_type="money",),
            ReportColumn( key="status", title="Статус",),
        ]
        
    def _build_summary(self, context):

        total_nominal = sum(
            certificate.total_amount
            for certificate in context.certificates
        )

        total_spent = sum(
            certificate.used_amount
            for certificate in context.certificates
        )

        total_balance = sum(
            certificate.balance
            for certificate in context.certificates
        )

        return [
            ReportSummaryItem(
                label="Количество сертификатов",
                value=len(context.certificates),
            ),
            ReportSummaryItem(
                label="Общий номинал",
                value=total_nominal,
            ),
            ReportSummaryItem(
                label="Использовано",
                value=total_spent,
            ),
            ReportSummaryItem(
                label="Общий остаток",
                value=total_balance,
            ),
        ]
        
    def _build_rows(self, context):
        rows = []
        for certificate in context.certificates:
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
                    "expiration_date": (
                        certificate.expiration_date
                    ),
                    "nominal": certificate.total_amount,
                    "spent": certificate.used_amount,
                    "balance": certificate.balance,
                    "status": (
                        "Активен"
                        if certificate.active
                        else "Неактивен"
                    ),
                }
            )

            rows.append(row)

        return rows