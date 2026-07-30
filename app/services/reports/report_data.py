# /app/services/reports/report_data.py

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass(slots=True)
class ReportSummaryItem:
    """Карточка сводной информации."""
    label: str
    value: Any


@dataclass(slots=True)
class ReportColumn:
    """Описание колонки таблицы."""
    key: str
    title: str
    data_type: str = "text"      # text, number, money, date, bool
    width: int | None = None


@dataclass(slots=True)
class ReportRow:

    values: dict[str, Any]
    children: list["ReportRow"] = field( default_factory=list)
    is_total: bool = False
    row_type: str = "default"
    level: int = 0
    columns: list[ReportColumn] | None = None


@dataclass(slots=True)
class ReportData:
    """Полностью сформированный отчет."""
    title: str

    columns: list[ReportColumn] = field(default_factory=list)
    rows: list[ReportRow] = field(default_factory=list)
    summary: list[ReportSummaryItem] = field(default_factory=list)

    filters: dict[str, Any] = field(default_factory=dict)

    generated_at: datetime = field(default_factory=datetime.now)