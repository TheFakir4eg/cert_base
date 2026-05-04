from dotenv import load_dotenv
load_dotenv()

from app import create_app, db
from app.models import Group, GroupPermission
from app.utils.permission_registry import get_all_permissions

app = create_app()

with app.app_context():

    print("== Seed permissions started ==")

    all_permissions = get_all_permissions()
    print("Всего permissions в registry:", len(all_permissions))

    # 1. Гарантируем существование админ-группы
    admin_group = db.session.execute(
        db.select(Group).filter_by(text="Default Group")
    ).scalar_one_or_none()

    if not admin_group:
        print("Default Group не найдена — создаём")
        admin_group = Group(
            text="Default Group",
            note="Auto-created admin group"
        )
        db.session.add(admin_group)
        db.session.commit()
        print("Default Group создана")

    # 2. Загружаем существующие связи
    existing = {
        (gp.group_id, gp.permission_name)
        for gp in GroupPermission.query.all()
    }

    print(f"Уже есть связей: {len(existing)}")

    # 3. Добавляем недостающие права
    added = 0

    for perm in all_permissions:
        key = (admin_group.id, perm)

        if key not in existing:
            db.session.add(
                GroupPermission(
                    group_id=admin_group.id,
                    permission_name=perm
                )
            )
            added += 1

    db.session.commit()

    print(f"Добавлено новых permissions: {added}")
    print("Seed успешно завершён 🚀")