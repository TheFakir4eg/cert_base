from app import create_app, db
from app.models import Group, User

app = create_app()

with app.app_context():

    print("== Seed core started ==")

    # GROUP
    group = db.session.execute(
        db.select(Group).filter_by(text="Default Group")
    ).scalar_one_or_none()

    if not group:
        group = Group(text="Default Group", note="System admin group")
        db.session.add(group)
        db.session.commit()

    # USER
    user = db.session.execute(
        db.select(User).filter_by(login="fakir")
    ).scalar_one_or_none()

    if not user:
        user = User(
            login="fakir",
            name="fakir",
            note="Main admin user",
            group_id=group.id
        )
        user.set_password("123456")
        db.session.add(user)
        db.session.commit()
    else:
        user.group_id = group.id
        user.set_password("123456")
        db.session.commit()

    print("Seed core done 🚀")