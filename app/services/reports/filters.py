# /app/services/reports/filters.py

from dataclasses import dataclass, fields
from datetime import date


@dataclass(slots=True)
class BaseReportFilter:

    date_from: date | None = None
    date_to: date | None = None

    export_excel: bool = False
    
    @classmethod
    def from_request(cls, args):

        instance = cls(
            date_from=cls._parse_date(
                args.get("date_from")
            ),
            date_to=cls._parse_date(
                args.get("date_to")
            ),
            export_excel=args.get("export_excel") == "1",
        )

        instance.validate()

        return instance
    
    @staticmethod
    def _parse_date(value):
        if not value:
            return None
        return date.fromisoformat(value)
    
    def to_dict(self):
        return {
            item.name: getattr(self, item.name)
            for item in fields(self)
        }

    def validate(self):
        if (
            self.date_from
            and self.date_to
            and self.date_from > self.date_to
        ):
            raise ValueError(
                "Дата начала не может быть позже даты окончания"
            )
        
        
@dataclass(slots=True)
class MovementReportFilter(BaseReportFilter):

    place_id: int | None = None
    mol_id: int | None = None
    series: str | None = None
    status: str | None = None
    
    @classmethod
    def from_request(cls, args):
        instance = cls(
            date_from=cls._parse_date(
                args.get("date_from")
            ),
            date_to=cls._parse_date(
                args.get("date_to")
            ),

            place_id=(
                int(args["place_id"])
                if args.get("place_id")
                else None
            ),

            mol_id=(
                int(args["mol_id"])
                if args.get("mol_id")
                else None
            ),
            series=args.get("series"),
            status=args.get("status"),
            export_excel=args.get("export_excel") == "1",
        )
        instance.validate()
        return instance
    
@dataclass(slots=True)
class BalancesReportFilter(BaseReportFilter):

    place_id: int | None = None
    mol_id: int | None = None
    series: str | None = None
    status: str | None = None
    balance_type: str | None = None
    
@dataclass(slots=True)
class UsageReportFilter(BaseReportFilter):

    series: str | None = None
    place_id: int | None = None
    mol_id: int | None = None
    client_id: int | None = None
    service_id: int | None = None
    servicegroup_id: int | None = None
    
@dataclass(slots=True)
class RegistryReportFilter(BaseReportFilter):

    place_id: int | None = None
    mol_id: int | None = None
    series: str | None = None
    status: str | None = None
    client_id: int | None = None
    #balance_type: str | None = None