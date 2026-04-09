// app/static/js/groupModalWindow.js

document.addEventListener('DOMContentLoaded', function() {
    const editButtons = document.querySelectorAll('.edit-group-btn');
    const createButton = document.getElementById('createGroupBtn'); // Кнопка "Создать"
    const modal = new bootstrap.Modal(document.getElementById('groupModal'));
    const modalBody = document.getElementById('groupModalBody');
    const modalTitle = document.getElementById('groupModalTitle');
    const saveBtn = document.getElementById('saveBtn');
    let currentMode = "edit"; // или "create"

    // --- Функция для загрузки содержимого модального окна ---
    function loadModalContent(group_id) {
        // Показываем спиннер
        modalBody.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
            </div>
        `;

        // Определяем URL в зависимости от group_id
        const url = group_id ? `/groups/get_group_modal_content/${group_id}` : `/groups/get_group_modal_content/new`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errData => {
                        throw new Error(errData.error || 'Ошибка загрузки данных');
                    });
                }
                return response.json();
            })
            .then(data => {
                modalBody.innerHTML = data.html;
                // Инициализируем обработчики после загрузки содержимого
                initializeModalHandlers(group_id);
            })
            .catch(error => {
                console.error('Ошибка при загрузке содержимого модального окна:', error);
                modalBody.innerHTML = `<div class="alert alert-danger">Ошибка: ${error.message}</div>`;
            });
    }

    // --- Обработчик для кнопки "Редактировать" ---
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            currentMode = "edit";
            const groupId = this.getAttribute('data-group-id');
            const groupName = this.getAttribute('data-group-name');
            modalTitle.textContent = `Управление группой: ${groupName}`;
            loadModalContent(groupId);
            modal.show();
        });
    });

    // --- Обработчик для кнопки "Создать" ---
    if (createButton) {
        createButton.addEventListener('click', function() {
                currentMode = "create";
                modalTitle.textContent = "Создание новой группы";
                loadModalContent("new");
                modal.show();
        });
    }

    // --- Обработчик для кнопки "Сохранить" ---
    // saveBtn.addEventListener('click', function() {
    //     let url;
    //     if (currentMode === "create") {
    //         url = "/api/group/create";
    //     } else {
    //         url = `/api/group/${groupId}/update`;
    //     }
    // });

    // --- Инициализация обработчиков для динамического содержимого ---
    function initializeModalHandlers(groupId) {
        // Объявляем переменные для хранения изменений
        // Лучше всего хранить их в замыкании функции initializeModalHandlers
        let changedPermissions = {};
        let changedUsers = { add: [], remove: [] };

        // --- Инициализация чекбоксов для удаления разрешений ---
        function initPermissionCheckboxes() {
            const permissionItems = document.querySelectorAll('#permissionsList > li');
            permissionItems.forEach(item => {
                const checkbox = item.querySelector('.permission-checkbox');
                if (checkbox) {
                    checkbox.style.display = 'inline-block';
                }
            });
        }

        // --- Показ/скрытие формы добавления разрешения ---
        const addPermissionBtn = document.getElementById('addPermissionBtn');
        const addPermissionForm = document.getElementById('addPermissionForm');
        const permissionsList = document.getElementById('permissionsList');
        const cancelAddPermissionBtn = document.getElementById('cancelAddPermissionBtn');

        if (addPermissionBtn) {
            addPermissionBtn.addEventListener('click', function() {
                addPermissionForm.style.display = 'block';
                permissionsList.style.display = 'none';
                // Очищаем форму
                document.getElementById('newResourceSelect').value = '';
                document.getElementById('newPermissionTypeSelect').value = '';
            });
        }

        if (cancelAddPermissionBtn) {
            cancelAddPermissionBtn.addEventListener('click', function() {
                addPermissionForm.style.display = 'none';
                permissionsList.style.display = 'block';
            });
        }

        // --- Сохранение нового разрешения ---
        const saveNewPermissionBtn = document.getElementById('saveNewPermissionBtn');

        if (saveNewPermissionBtn) {
            saveNewPermissionBtn.addEventListener('click', function() {
                const resourceId = document.getElementById('newResourceSelect').value;
                const permissionType = document.getElementById('newPermissionTypeSelect').value;

                if (!resourceId || !permissionType) {
                    alert('Пожалуйста, выберите ресурс и тип доступа');
                    return;
                }

                // Сохраняем изменение в объект changedPermissions
                if (!changedPermissions[resourceId]) {
                    changedPermissions[resourceId] = {
                        can_view: false,
                        can_add: false,
                        can_edit: false,
                        can_delete: false
                    };
                }

                changedPermissions[resourceId][permissionType] = true;

                // Добавляем в DOM
                addPermissionToDOM(resourceId, permissionType);

                // Скрываем форму и показываем список
                addPermissionForm.style.display = 'none';
                permissionsList.style.display = 'block';
            });
        }

        // Функция добавления разрешения в DOM
        function addPermissionToDOM(resourceId, permissionType) {
            // Проверяем, существует ли уже элемент для этого ресурса
            let existingItem = document.querySelector(`#permissionsList li[data-resource-id="${resourceId}"]`);

            if (existingItem) {
                // Обновляем существующий элемент
                const permissionMap = {
                    'can_view': { btn: '.btn-outline-info', icon: '👁️' },
                    'can_add': { btn: '.btn-outline-success', icon: '➕' },
                    'can_edit': { btn: '.btn-outline-warning', icon: '✏️' },
                    'can_delete': { btn: '.btn-outline-danger', icon: '🗑️' }
                };

                const config = permissionMap[permissionType];
                const btn = existingItem.querySelector(config.btn);
                if (btn) {
                    btn.innerHTML = config.icon;
                    btn.setAttribute('data-value', 'true');
                }
            } else {
                // Получаем название ресурса
                const resourceSelect = document.getElementById('newResourceSelect');
                const resourceName = resourceSelect.options[resourceSelect.selectedIndex].text;

                // Создаем новый элемент
                const newItem = document.createElement('li');
                newItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                newItem.setAttribute('data-resource-id', resourceId);

                const permissionIcons = {
                    can_view: '◻️',
                    can_add: '◻️',
                    can_edit: '◻️',
                    can_delete: '◻️'
                };

                // Активируем нужный тип доступа
                permissionIcons[permissionType] = {
                    'can_view': '👁️',
                    'can_add': '➕',
                    'can_edit': '✏️',
                    'can_delete': '🗑️'
                }[permissionType];

                newItem.innerHTML = `
                    <div class="d-flex justify-content-between w-100">
                        <span>${resourceName}</span>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-info permission-btn" data-permission="can_view" data-resource-id="${resourceId}" data-value="${permissionType === 'can_view'}">
                                ${permissionIcons.can_view}
                            </button>
                            <button type="button" class="btn btn-outline-success permission-btn" data-permission="can_add" data-resource-id="${resourceId}" data-value="${permissionType === 'can_add'}">
                                ${permissionIcons.can_add}
                            </button>
                            <button type="button" class="btn btn-outline-warning permission-btn" data-permission="can_edit" data-resource-id="${resourceId}" data-value="${permissionType === 'can_edit'}">
                                ${permissionIcons.can_edit}
                            </button>
                            <button type="button" class="btn btn-outline-danger permission-btn" data-permission="can_delete" data-resource-id="${resourceId}" data-value="${permissionType === 'can_delete'}">
                                ${permissionIcons.can_delete}
                            </button>
                        </div>
                    </div>
                    <input type="checkbox" class="form-check-input ms-2 permission-checkbox" data-resource-id="${resourceId}">
                `;

                // Удаляем сообщение "Нет разрешений", если оно есть
                const emptyMessage = permissionsList.querySelector('.text-muted');
                if (emptyMessage) {
                    emptyMessage.remove();
                }

                permissionsList.appendChild(newItem);

                // Добавляем обработчики для новых кнопок
                const newPermissionBtns = newItem.querySelectorAll('.permission-btn');
                newPermissionBtns.forEach(btn => {
                    btn.addEventListener('click', togglePermission);
                });

                // Добавляем чекбокс
                const newCheckbox = newItem.querySelector('.permission-checkbox');
                if (newCheckbox) {
                    newCheckbox.style.display = 'inline-block';
                }
            }
        }

        // --- Обработка изменения разрешений (клик по кнопкам) ---
        function togglePermission(event) {
            const btn = event.currentTarget;
            const resourceId = btn.getAttribute('data-resource-id');
            const permission = btn.getAttribute('data-permission');
            const currentValue = btn.getAttribute('data-value') === 'true';

            // Меняем состояние
            const newValue = !currentValue;

            // Обновляем отображение
            const icons = {
                'can_view': '👁️',
                'can_add': '➕',
                'can_edit': '✏️',
                'can_delete': '🗑️'
            };

            btn.innerHTML = newValue ? icons[permission] : '◻️';
            btn.setAttribute('data-value', newValue);

            // Сохраняем изменение
            if (!changedPermissions[resourceId]) {
                changedPermissions[resourceId] = {
                    can_view: false,
                    can_add: false,
                    can_edit: false,
                    can_delete: false
                };
            }

            changedPermissions[resourceId][permission] = newValue;
        }

        // --- Удаление выбранных разрешений ---
        const removeSelectedPermissionBtn = document.getElementById('removeSelectedPermissionBtn');

        if (removeSelectedPermissionBtn) {
            removeSelectedPermissionBtn.addEventListener('click', function() {
                const selectedCheckboxes = document.querySelectorAll('#permissionsList .permission-checkbox:checked');

                if (selectedCheckboxes.length === 0) {
                    alert('Пожалуйста, выберите разрешения для удаления');
                    return;
                }

                if (confirm(`Удалить ${selectedCheckboxes.length} разрешение(й)?`)) {
                    selectedCheckboxes.forEach(checkbox => {
                        const listItem = checkbox.closest('li');
                        const resourceId = listItem.getAttribute('data-resource-id');

                        // Помечаем для удаления (устанавливаем все разрешения в false)
                        if (!changedPermissions[resourceId]) {
                            changedPermissions[resourceId] = {
                                can_view: false,
                                can_add: false,
                                can_edit: false,
                                can_delete: false
                            };
                        } else {
                            changedPermissions[resourceId].can_view = false;
                            changedPermissions[resourceId].can_add = false;
                            changedPermissions[resourceId].can_edit = false;
                            changedPermissions[resourceId].can_delete = false;
                        }

                        // Удаляем из DOM
                        listItem.remove();
                    });

                    // Если список стал пустым, показываем сообщение
                    if (permissionsList.children.length === 0) {
                        permissionsList.innerHTML = '<li class="list-group-item text-muted text-center">Нет разрешений.</li>';
                    }
                }
            });
        }

        // --- Показ/скрытие формы добавления пользователя ---
        const addUserBtn = document.getElementById('addUserBtn');
        const addUserForm = document.getElementById('addUserForm');
        const usersList = document.getElementById('usersList');
        const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');

        if (addUserBtn) {
            addUserBtn.addEventListener('click', function() {
                addUserForm.style.display = 'block';
                usersList.style.display = 'none';
                document.getElementById('newUserSelect').value = '';
            });
        }

        if (cancelAddUserBtn) {
            cancelAddUserBtn.addEventListener('click', function() {
                addUserForm.style.display = 'none';
                usersList.style.display = 'block';
            });
        }

        // --- Добавление пользователя ---
        const saveNewUserBtn = document.getElementById('saveNewUserBtn');

        if (saveNewUserBtn) {
            saveNewUserBtn.addEventListener('click', function() {
                const userId = document.getElementById('newUserSelect').value;
                const userName = document.getElementById('newUserSelect').options[document.getElementById('newUserSelect').selectedIndex]?.text;

                if (!userId) {
                    alert('Пожалуйста, выберите пользователя');
                    return;
                }

                // Сохраняем в список на добавление
                changedUsers.add.push(parseInt(userId));

                // Удаляем из списка на удаление, если был
                const removeIndex = changedUsers.remove.indexOf(parseInt(userId));
                if (removeIndex !== -1) {
                    changedUsers.remove.splice(removeIndex, 1);
                }

                // Добавляем в DOM
                addUserToDOM(userId, userName);

                // Скрываем форму и показываем список
                addUserForm.style.display = 'none';
                usersList.style.display = 'block';
            });
        }

        // Функция добавления пользователя в DOM
        function addUserToDOM(userId, userName) {
            // Проверяем, существует ли уже такой пользователь
            const existingUser = document.querySelector(`#usersList li[data-user-id="${userId}"]`);
            if (existingUser) {
                return;
            }

            const newUserItem = document.createElement('li');
            newUserItem.className = 'list-group-item d-flex justify-content-between align-items-center';
            newUserItem.setAttribute('data-user-id', userId);
            newUserItem.innerHTML = `
                ${userName}
                <input type="checkbox" class="form-check-input user-checkbox" value="${userId}">
            `;

            // Удаляем сообщение "Группа пуста", если оно есть
            const emptyMessage = usersList.querySelector('.text-muted');
            if (emptyMessage) {
                emptyMessage.remove();
            }

            usersList.appendChild(newUserItem);

            // Обновляем счетчик пользователей
            const userCount = document.querySelectorAll('#usersList li:not(.text-muted)').length;
            const cardTitle = document.querySelector('.col-md-6:last-child .card-title');
            if (cardTitle) {
                cardTitle.textContent = `Пользователи (${userCount})`;
            }
        }

        // --- Удаление выбранных пользователей ---
        const removeSelectedUserBtn = document.getElementById('removeSelectedUserBtn');

        if (removeSelectedUserBtn) {
            removeSelectedUserBtn.addEventListener('click', function() {
                const selectedCheckboxes = document.querySelectorAll('#usersList .user-checkbox:checked');

                if (selectedCheckboxes.length === 0) {
                    alert('Пожалуйста, выберите пользователей для удаления');
                    return;
                }

                if (confirm(`Удалить ${selectedCheckboxes.length} пользователя(ей) из группы?`)) {
                    selectedCheckboxes.forEach(checkbox => {
                        const userId = parseInt(checkbox.value);
                        const listItem = checkbox.closest('li');

                        // Сохраняем в список на удаление
                        if (!changedUsers.remove.includes(userId)) {
                            changedUsers.remove.push(userId);
                        }

                        // Удаляем из списка на добавление, если был
                        const addIndex = changedUsers.add.indexOf(userId);
                        if (addIndex !== -1) {
                            changedUsers.add.splice(addIndex, 1);
                        }

                        // Удаляем из DOM
                        listItem.remove();
                    });

                    // Обновляем счетчик пользователей
                    const userCount = document.querySelectorAll('#usersList li:not(.text-muted)').length;
                    const cardTitle = document.querySelector('.col-md-6:last-child .card-title');
                    if (cardTitle) {
                        cardTitle.textContent = `Пользователи (${userCount})`;
                    }

                    // Если список стал пустым, показываем сообщение
                    if (usersList.children.length === 0) {
                        usersList.innerHTML = '<li class="list-group-item text-muted text-center">Группа пуста.</li>';
                    }
                }
            });
        }

        // --- Сохранение изменений (внутри initializeModalHandlers) ---
        // Обработчик для кнопки "Сохранить" теперь находится внутри, чтобы иметь доступ к changedPermissions и changedUsers
        //saveBtn.removeEventListener('click', saveBtnHandler); // Удаляем старый обработчик, если был
        saveBtn.replaceWith(saveBtn.cloneNode(true));
        const newSaveBtn = document.getElementById("saveBtn");
        newSaveBtn.addEventListener("click", saveBtnHandler);
        
        function saveBtnHandler() {
            //let url;
            //     if (currentMode === "create") {
            //         url = "/api/group/create";
            //     } else {
            //         url = `/api/group/${groupId}/update`;
            //     }
            if (currentMode === "edit") {
                // Собираем данные для отправки
                const dataToSave = {
                    group_id: groupId, // Используем groupId из аргумента функции
                    permissions: [],
                    users_to_add: [...changedUsers.add], // Создаём копию массива
                    users_to_remove: [...changedUsers.remove]
                };

                // Формируем список разрешений
                for (const [resourceId, perms] of Object.entries(changedPermissions)) {
                    dataToSave.permissions.push({
                        resource_id: parseInt(resourceId),
                        can_view: perms.can_view,
                        can_add: perms.can_add,
                        can_edit: perms.can_edit,
                        can_delete: perms.can_delete
                    });
                }

                // Если нет изменений, просто закрываем модальное окно
                if (dataToSave.permissions.length === 0 &&
                    dataToSave.users_to_add.length === 0 &&
                    dataToSave.users_to_remove.length === 0) {
                    modal.hide();
                    return;
                }

                // Отправляем на сервер
                fetch(`/groups/${groupId}/update`, { // Используем groupId из аргумента
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSave)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Изменения успешно сохранены');
                        modal.hide(); // Закрываем модальное окно после сохранения
                        // Опционально: перезагрузить страницу списка групп
                        location.reload();
                    } else {
                        alert('Ошибка: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                    alert('Произошла ошибка при сохранении');
                });
            }
            else {
                // Собираем данные для отправки
                const groupNameInput = document.getElementById("newGroupNameInput");

                if (!groupNameInput || !groupNameInput.value.trim()) {
                    alert("Введите название группы");
                    return;
                }

                const groupName = groupNameInput.value.trim();
                const dataToSave = {
                    name: groupName,
                    permissions: [],
                    users_to_add: [...changedUsers.add], // Создаём копию массива
                    users_to_remove: [...changedUsers.remove]
                };

                // Формируем список разрешений
                for (const [resourceId, perms] of Object.entries(changedPermissions)) {
                    dataToSave.permissions.push({
                        resource_id: parseInt(resourceId),
                        can_view: perms.can_view,
                        can_add: perms.can_add,
                        can_edit: perms.can_edit,
                        can_delete: perms.can_delete
                    });
                }

                // Если нет изменений, просто закрываем модальное окно
                if (currentMode === "create" && !groupName) return;

                // Отправляем на сервер
                fetch(`/groups/create`, { // Используем groupId из аргумента
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSave)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert('Группа успешно создана');
                        modal.hide(); // Закрываем модальное окно после сохранения
                        // Опционально: перезагрузить страницу списка групп
                        location.reload();
                    } else {
                        alert('Ошибка: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Ошибка:', error);
                    alert('Произошла ошибка при создании');
                });
            }
        }
        saveBtn.addEventListener('click', saveBtnHandler); // Добавляем новый обработчик

        // --- Инициализация при запуске ---
        initPermissionCheckboxes();
        document.querySelectorAll('.permission-btn').forEach(btn => {
            btn.addEventListener('click', togglePermission);
        });
    }
});