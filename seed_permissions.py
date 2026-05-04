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

    groups = Group.query.all()

    if not groups:
        print("Нет групп — сидить нечего")
        exit()

    # предполагаем что первая группа — админы
    admin_group = groups[0]

    print(f"Назначаем ВСЕ права группе: {admin_group.text}")

    # очищаем старые записи (если были попытки)
    #GroupPermission.query.delete()
    existing = {
        (gp.group_id, gp.permission_name)
        for gp in GroupPermission.query.all()
    }

    for perm in all_permissions:
        if (admin_group.id, perm) not in existing:
            db.session.add(
                GroupPermission(
                    group_id=admin_group.id,
                    permission_name=perm
                )
            )

    db.session.commit()

    print("Seed успешно завершён 🚀")