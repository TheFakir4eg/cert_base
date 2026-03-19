# create_user.py

# Импортируем функцию для создания приложения и модели
from app import create_app, db
from app.models import User, Group # Импортируем и Group, если нужно создать группу

# Создаём экземпляр приложения
app = create_app()

# Открываем контекст приложения
with app.app_context():
    # Проверим, существует ли группа с id=1. Если нет - создадим.
    # Это нужно, потому что у User обязательный внешний ключ group_id.
    group = db.session.execute(db.select(Group).filter_by(id=1)).scalar_one_or_none()
    if not group:
        print("Группа с id=1 не найдена. Создаём её.")
        group = Group(text="Default Group", note="Стандартная группа") # Измени текст по желанию
        db.session.add(group)
        db.session.flush() # flush() позволяет получить id новой группы до commit()
        print(f"Создана группа с id={group.id}")

    # Создаём пользователя fakir
    existing_user = db.session.execute(db.select(User).filter_by(name='fakir')).scalar_one_or_none()
    if existing_user:
        print("Пользователь 'fakir' уже существует. Обновляем данные...")
        
        # Обновляем данные существующего пользователя
        existing_user.login = 'fakir'
        existing_user.name = 'fakir'
        existing_user.note = 'Main admin user (updated)'
        existing_user.group_id = group.id
        existing_user.set_password('Ytrhjvfyn16!!!')
        
        db.session.commit()
        print("Данные пользователя 'fakir' успешно обновлены!")

    else:
        new_user = User(login = 'fakir', name='fakir', note='Main admin user', group_id=group.id) # Указываем id группы
        new_user.set_password('Ytrhjvfyn16!!!') # Установим ему пароль

        db.session.add(new_user)
        db.session.commit()

        print("Пользователь 'fakir' успешно создан!")