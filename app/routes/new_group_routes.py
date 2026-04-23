# /app/routes/new_group_routes.py
from flask import Blueprint, jsonify, abort, request
from app import db
from app.models import Group, User, GroupPermission
from app.utils.permission_registry import permission_exists, get_permissions_by_section


bp = Blueprint("new_groups", __name__, url_prefix="/api/groups")

def get_group_permissions(group_id: int) -> list[str]:
    rows = db.session.execute(
        db.select(GroupPermission.permission_name)
        .filter_by(group_id=group_id)
    ).scalars().all()

    return list(rows)

@bp.get("/<int:group_id>")
def get_group(group_id):
    print('router /id')
    group = db.get_or_404(Group, group_id)

    users = db.session.execute(
        db.select(User).filter_by(group_id=group_id, active=True)
    ).scalars().all()

    permissions = get_group_permissions(group_id)

    return jsonify({
        "group": {
            "id": group.id,
            "text": group.text,
            "note": group.note,
        },
        "users": [
            {"id": u.id, "name": u.name, "login": u.login}
            for u in users
        ],
        "permissions": permissions   # ← ключевая часть
    })
    
@bp.post("/<int:group_id>")
def update_group(group_id):
    group = db.get_or_404(Group, group_id)
    data = request.get_json()

    new_name = data.get("text", "").strip()
    new_note = data.get("note", "")
    user_ids = data.get("users", [])
    permissions = data.get("permissions", [])

    # --- ВАЛИДАЦИЯ PERMISSIONS ---
    invalid = [p for p in permissions if not permission_exists(p)]
    if invalid:
        abort(400, f"Unknown permissions: {invalid}")

    # валидация имени
    if not new_name:
        abort(400, "Group name is required")
    
    # --- Обновляем группу ---
    group.text = new_name
    group.note = new_note

    # --- Обновляем пользователей ---
    db.session.execute(
        db.update(User)
        .where(User.group_id == group_id)
        .values(group_id=None)
    )

    if user_ids:
        db.session.execute(
            db.update(User)
            .where(User.id.in_(user_ids))
            .values(group_id=group_id)
        )

    # --- ОБНОВЛЯЕМ PERMISSIONS ГРУППЫ ---
    db.session.execute(
        db.delete(GroupPermission).filter_by(group_id=group_id)
    )

    db.session.bulk_save_objects([
        GroupPermission(group_id=group_id, permission_name=p)
        for p in permissions
    ])

    db.session.commit()

    return {"status": "ok"}

@bp.get("/permissions")
def get_permissions():
    """
    Отдаёт полный список разрешений из permission_registry.json
    для построения UI модалки групп.
    """
    return {
        "sections": get_permissions_by_section()
    }
    
@bp.post("/")
def create_group():
    data = request.get_json()

    name = data.get("text", "").strip()
    note = data.get("note", "")
    user_ids = data.get("users", [])
    permissions = data.get("permissions", [])

    if not name:
        abort(400, "Group name is required")

    # --- валидация permissions ---
    invalid = [p for p in permissions if not permission_exists(p)]
    if invalid:
        abort(400, f"Unknown permissions: {invalid}")

    # --- создаём группу ---
    group = Group(text=name, note=note)
    db.session.add(group)
    db.session.flush()  # получаем group.id без commit

    # --- назначаем пользователей ---
    if user_ids:
        db.session.execute(
            db.update(User)
            .where(User.id.in_(user_ids))
            .values(group_id=group.id)
        )

    # --- назначаем permissions ---
    db.session.bulk_save_objects([
        GroupPermission(group_id=group.id, permission_name=p)
        for p in permissions
    ])

    db.session.commit()

    return {"status": "ok", "group_id": group.id}

@bp.delete("/<int:group_id>")
def delete_group(group_id):
    group = db.get_or_404(Group, group_id)

    users_count = db.session.execute(
        db.select(User).filter_by(group_id=group_id, active=True)
    ).scalars().all()

    if users_count:
        abort(400, "Cannot delete group with users. Remove users first.")

    db.session.delete(group)
    db.session.commit()

    return {"status": "deleted"}

@bp.get("/users")
def get_all_users():
    users = db.session.execute(
        db.select(User).order_by(User.name)
    ).scalars().all()
    print('router /users')
    return {
        "users": [
            {
                "id": u.id,
                "name": u.name,
                "login": u.login,
                "group_id": u.group_id
            }
            for u in users
        ]
    }
    
# @bp.get("/api/groups/<int:group_id>/users")
# def get_group_users(group_id):
#     from app.models import User, Group
#     from app import db

#     group = Group.query.get_or_404(group_id)

#     users = User.query.filter_by(group_id=group_id, active=True).all()

#     return {
#         "group": {
#             "id": group.id,
#             "text": group.text
#         },
#         "users": [u.id for u in users]  # <-- ВАЖНО: только ID
#     }

# @bp.get("/api/groups/<int:group_id>/users")
# def get_group_users(group_id):
    
#     group = Group.query.get_or_404(group_id)
    
#     users = User.query.filter_by(
#         group_id=group_id,
#         active=True          # добавляем фильтр по активным пользователям
#     ).all()
    
#     print(users)
    
#     return {
#         "group": {
#             "id": group.id,
#             "text": group.text
#         },
#         "users": [u.id for u in users]   # только ID
#     }

from flask import current_app
import sys

@bp.get("/api/groups/<int:group_id>/users")
def get_group_users(group_id):
    print('/api/groups/<int:group_id>/users')
    group = Group.query.get_or_404(group_id)
    
    # === СУПЕР-ДИАГНОСТИКА (должно точно появиться) ===
    print("=== ДИАГНОСТИКА /api/groups/1/users ===", flush=True)
    sys.stderr.write("=== ДИАГНОСТИКА через stderr ===\n")
    sys.stderr.flush()
    
    current_app.logger.warning("=== LOGGER WARNING - ДОЛЖНО ВИДЕТЬСЯ ===")
    current_app.logger.error("=== LOGGER ERROR - ТОЧНО ВИДЕТЬСЯ ===")
    
    # Все пользователи группы
    all_users = User.query.filter_by(group_id=group_id).all()
    
    print(f"Всего пользователей в группе {group_id}: {len(all_users)}", flush=True)
    
    for u in all_users:
        print(f"User {u.id} | login={u.login} | active(column)={u.active} | "
              f"is_active(property)={u.is_active}", flush=True)
    
    # Фильтр — используем самый надёжный способ
    users = User.query.filter(
        User.group_id == group_id,
        User.active == True
    ).all()
    
    print(f"После фильтра active=True найдено: {len(users)}", flush=True)
    print("ID активных:", [u.id for u in users], flush=True)
    
    return {
        "group": {
            "id": group.id,
            "text": group.text
        },
        "users": [u.id for u in users]
    }