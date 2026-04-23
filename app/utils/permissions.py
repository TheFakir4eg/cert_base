# /app/utils/permissions.py

from functools import wraps
from flask import abort, flash
from flask_login import current_user


def permission_required(permission_name: str):
    """
    Декоратор проверки доступа по permission_name

    Пример:
        @permission_required("users_page")
        @permission_required("users_edit")
    """

    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):

            # 1️⃣ пользователь не залогинен
            if not current_user.is_authenticated:
                abort(401)

            # 2️⃣ нет прав
            if not current_user.has_permission(permission_name):
                flash("У вас нет доступа к этому действию", "danger")
                abort(403)

            return f(*args, **kwargs)

        return wrapper

    return decorator