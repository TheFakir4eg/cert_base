# app/services/filters.py

def money(value):
    if value is None:
        return ""

    return f"{value:,.2f}".replace(",", " ")