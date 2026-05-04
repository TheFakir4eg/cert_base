from app import create_app, db
from app.models import User, Group, Permission

app = create_app()

def ensure_group():
    group = db.session.execute(
        db.select(Group).filter_by(text="Default Group")
    ).scalar_one_or_none()

    if not group:
        group = Group(text="Default Group", note="System group")
        db.session.add(group)
        db.session.flush()

    return group


def ensure_admin(group):
    user = db.session.execute(
        db.select(User).filter_by(login="fakir")
    ).scalar_one_or_none()

    if not user:
        user = User(
            login="fakir",
            name="fakir",
            note="Main admin",
            group_id=group.id
        )
        db.session.add(user)

    user.set_password("123456")
    user.active = True


def run():
    with app.app_context():
        group = ensure_group()
        ensure_admin(group)

        db.session.commit()
        print("Bootstrap seed done")


if __name__ == "__main__":
    run()