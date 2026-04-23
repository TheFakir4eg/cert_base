# /app/utils/permission_registry.py
import json
from pathlib import Path
from flask import current_app

_registry_cache = None


def _load_registry_from_file():
    """Читает permission_registry.json с диска"""
    registry_path = Path(current_app.root_path) / "permission_registry.json"

    with open(registry_path, "r", encoding="utf-8") as f:
        return json.load(f)


def get_registry():
    """Возвращает registry (с кэшированием)"""
    global _registry_cache

    if _registry_cache is None:
        _registry_cache = _load_registry_from_file()
        current_app.logger.info("Permission registry loaded")

    return _registry_cache

def get_all_permissions() -> list[str]:
    """Возвращает список ВСЕХ permission_name"""
    registry = get_registry()

    permissions = []
    for section in registry["sections"]:
        for perm in section["permissions"]:
            permissions.append(perm["name"])

    return permissions


def get_permissions_by_section():
    """Возвращает registry в удобном виде для UI"""
    return get_registry()["sections"]


def permission_exists(permission_name: str) -> bool:
    """Проверка что permission существует в registry"""
    return permission_name in get_all_permissions()