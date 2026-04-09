Ресурсы
    1. Страница «Настройки»
	
		name = 'settings_page'
		description = 'Страница "Настройки"'
		route = '/settings'
		
        1.1 Страница «Места выдачи»
		
			name = 'places_page'
			description = 'Страница "Места выдачи"'
			route = '/places'
			
            1.1.1 Кнопка «Добавить»
			
			name = 'places_add_btn'
			description = 'Кнопка "Добавить" на странице "Места выдачи"'
			
            1.1.2 Кнопка «Редактировать»
			
			name = 'places_edit_btn'
			description = 'Кнопка "Редактировать" на странице "Места выдачи"'
			
            1.1.3 Кнопка «Удалить»
			
			name = 'places_delete_btn'
			description = 'Кнопка "Удалить" на странице "Места выдачи"'
			
        1.2 Страница «Пользователи»
			
			name = 'users_page'
			description = 'Страница "Пользователи"'
			route = '/users'
			
            1.2.1 Кнопка «Добавить»
			
			name = 'users_add_btn'
			description = 'Кнопка "Добавить" на странице "Пользователи"'
			
            1.2.2 Кнопка «Редактировать»
			
			name = 'users_edit_btn'
			description = 'Кнопка "Редактировать" на странице "Пользователи"'
			
            1.2.3 Кнопка «Удалить»
			
			name = 'users_delete_btn'
			description = 'Кнопка "Удалить" на странице "Пользователи"'
			
        1.3 Страница «Группы пользователей»
			
			name = 'users_group_page'
			description = 'Страница "Группы пользователей"'
			route = '/groups'
			
            1.3.1 Кнопка «Добавить»
			
			name = 'users_group_add_btn'
			description = 'Кнопка "Добавить" на странице "Группы пользователей"'
			route = '/groups/get_group_modal_content/new'
			
            1.3.2 Кнопка «Редактировать»
			
			name = 'users_group_edit_btn'
			description = 'Кнопка "Редактировать" на странице "Группы пользователей"'
			route = '/groups/<int:group_id>/update'
			
            1.3.3 Кнопка «Удалить»
			
			name = 'users_group_delete_btn'
			description = 'Кнопка "Удалить" на странице "Группы пользователей"'
			
        1.4 Страница «Группы услуг»
			
			name = 'servicegroup_page'
			description = 'Страница "Группы услуг"'
			route = '/servicegroup'
			
            1.4.1 Кнопка «Добавить»
			
			name = 'servicegroup_edit_btn'
			description = 'Кнопка "Добавить" на странице "Группы услуг"'
			
            1.4.2 Кнопка «Редактировать»
			
			name = 'servicegroup_edit_btn'
			description = 'Кнопка "Добавить" на странице "Группы услуг"'
			
            1.4.3 Кнопка «Удалить»
			
			name = 'servicegroup_delete_btn'
			description = 'Кнопка "Добавить" на странице "Группы услуг"'
			
    2. Страница «Сертификаты»
		
		name = 'certificates_page'
		description = 'Страница "Сертификаты"'
		route = '/certificates'