PS C:\Pankov\cert_base> tree /f
Структура папок
Серийный номер тома: 9855-A8ED
C:.
│   .env
│   .gitignore
│   create_user.py
│   DevLog.md
│   docker-compose.yml
│   help.txt
│   populate_resourses.py
│   requirements.txt
│   resources_config.json
│   resourses.md
│   run.py
│   seed_permissions.py
│   tree.md
│   
├───app
│   │   config.py
│   │   models.py
│   │   permissions_registry.json
│   │   __init__.py
│   │   
│   ├───routes
│   │   │   auth_routes.py
│   │   │   certificate_routes.py
│   │   │   group_routes.py
│   │   │   new_group_routes.py
│   │   │   places_routes.py
│   │   │   service_group_routes.py
│   │   │   settings_routes.py
│   │   │   users_routes.py
│   │   │   __init__.py
│   │   │   
│   │   └───__pycache__
│   │           auth_routes.cpython-313.pyc
│   │           auth_routes.cpython-314.pyc
│   │           certificate_routes.cpython-313.pyc
│   │           certificate_routes.cpython-314.pyc
│   │           groups_routes.cpython-313.pyc
│   │           group_routes.cpython-313.pyc
│   │           group_routes.cpython-314.pyc
│   │           new_group_routes.cpython-314.pyc
│   │           permission_group_manager.cpython-313.pyc
│   │           places_routes.cpython-313.pyc
│   │           places_routes.cpython-314.pyc
│   │           settings_routes.cpython-313.pyc
│   │           settings_routes.cpython-314.pyc
│   │           users_routes.cpython-313.pyc
│   │           users_routes.cpython-314.pyc
│   │           __init__.cpython-313.pyc
│   │           __init__.cpython-314.pyc
│   │           
│   ├───static
│   │   ├───css
│   │   │       style.css
│   │   │       
│   │   ├───icons
│   │   │       .png
│   │   │       minus.png
│   │   │       plus.png
│   │   │       
│   │   └───js
│   │           groupManager.js
│   │           groupModalWindow.js
│   │           newGroupModalWindow.js
│   │           userModalWindow.js
│   │           utils.js
│   │           
│   ├───templates
│   │   │   base.html
│   │   │   index.html
│   │   │   login.html
│   │   │   
│   │   ├───certificates
│   │   │       list.html
│   │   │       
│   │   ├───groups
│   │   │       _group_modal_body.html
│   │   │       _new_group_modal_body.html
│   │   │       
│   │   ├───places
│   │   │       list.html
│   │   │       
│   │   ├───settings
│   │   │       group_list.html
│   │   │       group_permissions.html
│   │   │       servicegroup.html
│   │   │       settings.html
│   │   │       
│   │   └───users
│   │           list.html
│   │           
│   ├───utils
│   │   │   permissions.py
│   │   │   permission_registry.py
│   │   │   
│   │   └───__pycache__
│   │           permissions.cpython-313.pyc
│   │           permissions.cpython-314.pyc
│   │           permission_registry.cpython-314.pyc
│   │           
│   └───__pycache__
│           models.cpython-313.pyc
│           models.cpython-314.pyc
│           __init__.cpython-313.pyc
│           __init__.cpython-314.pyc
│           
├───migrations
│   │   alembic.ini
│   │   env.py
│   │   README
│   │   script.py.mako
│   │   
│   ├───versions
│   │   │   0ebc28cecef7_increase_password_hash_length_to_255.py
│   │   │   250697c82b3a_permission_resourse_id_nullable_true.py
│   │   │   420c05e66ac8_initial_migration.py
│   │   │   5d603d996b03_add_table_servicegroup.py
│   │   │   6596ac98a06b_users_group_id_nullable_true.py
│   │   │   85ef305995ab_add_password_hash_to_user_model.py
│   │   │   a4c1da4b656f_добавлены_таблицы_для_настрйоки_прав_.py
│   │   │   d360d9515d8e_add_login_into_user.py
│   │   │   dd1f2332bd14_add_active_status_field_to_user_model.py
│   │   │   
│   │   └───__pycache__
│   │           0ebc28cecef7_increase_password_hash_length_to_255.cpython-313.pyc
│   │           0ebc28cecef7_increase_password_hash_length_to_255.cpython-314.pyc
│   │           250697c82b3a_permission_resourse_id_nullable_true.cpython-313.pyc
│   │           250697c82b3a_permission_resourse_id_nullable_true.cpython-314.pyc
│   │           420c05e66ac8_initial_migration.cpython-313.pyc
│   │           420c05e66ac8_initial_migration.cpython-314.pyc
│   │           5d603d996b03_add_table_servicegroup.cpython-313.pyc
│   │           5d603d996b03_add_table_servicegroup.cpython-314.pyc
│   │           6596ac98a06b_users_group_id_nullable_true.cpython-313.pyc
│   │           6596ac98a06b_users_group_id_nullable_true.cpython-314.pyc
│   │           85ef305995ab_add_password_hash_to_user_model.cpython-313.pyc
│   │           85ef305995ab_add_password_hash_to_user_model.cpython-314.pyc
│   │           a4c1da4b656f_добавлены_таблицы_для_настрйоки_прав_.cpython-313.pyc
│   │           a4c1da4b656f_добавлены_таблицы_для_настрйоки_прав_.cpython-314.pyc
│   │           d360d9515d8e_add_login_into_user.cpython-313.pyc
│   │           d360d9515d8e_add_login_into_user.cpython-314.pyc
│   │           dd1f2332bd14_add_active_status_field_to_user_model.cpython-313.pyc
│   │           dd1f2332bd14_add_active_status_field_to_user_model.cpython-314.pyc
│   │           
│   └───__pycache__
│           env.cpython-313.pyc
│           env.cpython-314.pyc
│           
└───old_files
        group_list.html
        permission_group_manager.py
        