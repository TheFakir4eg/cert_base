# populate_resources.py
import json
import sys
from app import create_app, db
from app.models import Resource
from sqlalchemy import select

def load_config(filename):
    """Загружает конфигурацию ресурсов из JSON-файла."""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config.get('resources', [])
    except FileNotFoundError:
        print(f"Ошибка: Файл конфигурации '{filename}' не найден.")
        return []
    except json.JSONDecodeError:
        print(f"Ошибка: Файл конфигурации '{filename}' содержит некорректный JSON.")
        return []

def sync_resources(resources_config):
    """Синхронизирует таблицу resources с конфигурацией из JSON."""
    app = create_app()

    with app.app_context():
        print("Подключение к базе данных и начало транзакции...")

        # 1. Загружаем все ресурсы из базы данных
        existing_resources_db = db.session.execute(select(Resource)).scalars().all()
        # Создаём словарь для быстрого поиска: name -> Resource object
        existing_resources_map = {res.name: res for res in existing_resources_db}

        added_count = 0
        updated_count = 0
        unchanged_count = 0

        # 2. Проходим по ресурсам из JSON-файла
        for res_data in resources_config:
            name = res_data.get('name')
            description = res_data.get('description')
            route = res_data.get('route')

            if not name:
                print(f"Пропущена запись без 'name': {res_data}")
                continue

            # 3. Проверяем, существует ли ресурс в базе
            existing_res = existing_resources_map.get(name)

            if existing_res:
                # 4. Ресурс существует - проверяем на изменения
                needs_update = False
                if existing_res.description != description:
                    existing_res.description = description
                    needs_update = True
                if existing_res.route != route:
                    existing_res.route = route
                    needs_update = True

                if needs_update:
                    print(f"Обновлён ресурс: {name}")
                    updated_count += 1
                else:
                    print(f"Ресурс '{name}' не изменился.")
                    unchanged_count += 1
            else:
                # 5. Ресурс не существует - создаём новый
                new_resource = Resource(
                    name=name,
                    description=description,
                    route=route
                )
                db.session.add(new_resource)
                print(f"Добавлен ресурс: {name}")
                added_count += 1

        # 6. (Опционально) Удаление ресурсов, которых нет в JSON
        # json_names = {res['name'] for res in resources_config}
        # for name, db_res in existing_resources_map.items():
        #     if name not in json_names:
        #         print(f"Планируется удаление ресурса: {name} (нет в JSON)")
        #         # db.session.delete(db_res) # Раскомментируйте, если нужно удалять

        try:
            changes_made = added_count + updated_count
            if changes_made > 0:
                db.session.commit()
                print(f"\n--- Результаты синхронизации ---")
                print(f"Добавлено: {added_count}")
                print(f"Обновлено: {updated_count}")
                print(f"Без изменений: {unchanged_count}")
                print(f"Всего изменений внесено: {changes_made}")
            else:
                print(f"\n--- Результаты синхронизации ---")
                print(f"Нет изменений для внесения.")
                print(f"Без изменений: {unchanged_count}")

        except Exception as e:
            db.session.rollback()
            print(f"\n--- ОШИБКА ---")
            print(f"Произошла ошибка при сохранении в базу данных: {e}")
            sys.exit(1)

if __name__ == '__main__':
    config_file = 'resources_config.json'
    print(f"Загрузка конфигурации из {config_file}...")
    resources = load_config(config_file)

    if resources:
        print(f"Найдено {len(resources)} ресурсов в конфигурации.")
        sync_resources(resources)
    else:
        print("Конфигурация пуста или не была загружена.")
        sys.exit(1)