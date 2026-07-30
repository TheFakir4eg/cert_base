# /app/services/reports/base.py

from abc import ABC, abstractmethod

from .report_data import ReportData


class BaseReport(ABC):

    title = ""

    @abstractmethod
    def build(self, filters):
        ...

    def _certificate_query(self):
        ...

    def _apply_certificate_filters(
        self,
        query,
        filters,
    ):
        ...

    def _load_certificates(
        self,
        filters,
    ):
        ...