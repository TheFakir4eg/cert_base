// app/static/js/userModalWindow.js

document.addEventListener('DOMContentLoaded', function() {
    // Находим элементы формы
    const form = document.getElementById('userForm');
    const formActionInput = document.getElementById('formAction');
    const userIdInput = document.getElementById('userIdInput');
    const loginInput = document.getElementById('login');
    const nameInput = document.getElementById('name');
    const passwordInput = document.getElementById('password');
    const groupIdSelect = document.getElementById('group_id');
    const activeCheckbox = document.getElementById('active');
    const modalTitle = document.getElementById('createUserModalLabel');
    const submitBtn = document.getElementById('submitBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const openCreateModalBtn = document.getElementById('openCreateModalBtn');

    // Находим все кнопки редактирования
    const editButtons = document.querySelectorAll('.edit-user-btn');

    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Получаем данные пользователя из data-атрибутов
            const userId = this.getAttribute('data-user-id');
            const login = this.getAttribute('data-login');
            const name = this.getAttribute('data-name');
            const groupId = this.getAttribute('data-group-id');
            const isActive = this.getAttribute('data-active') === 'true';

            // Заполняем форму данными пользователя
            userIdInput.value = userId; // ID для редактирования
            loginInput.value = login;
            nameInput.value = name;
            passwordInput.value = ''; // Не заполняем пароль при редактировании
            groupIdSelect.value = groupId; // Выбираем нужную группу
            activeCheckbox.checked = isActive; // Устанавливаем чекбокс активности

            // Меняем состояние формы на "редактирование"
            formActionInput.value = 'edit'; // Устанавливаем action=edit
            modalTitle.textContent = `Редактировать пользователя: ${name}`;
            submitBtn.textContent = 'Сохранить';
            closeModalBtn.style.display = 'none'; // Скрываем кнопку "Закрыть" (для создания)
            cancelEditBtn.style.display = 'inline-block'; // Показываем кнопку "Отмена" (для редактирования)

            // УБРАТЬ атрибут 'required' с поля пароля при редактировании
            passwordInput.removeAttribute('required');
            // Обновить подсказку
            passwordHelp.textContent = 'Оставьте пустым, если не хотите менять пароль.';

            // Открываем модальное окно
            const modal = new bootstrap.Modal(document.getElementById('createUserModal'));
            modal.show();
        });
    });

    // Обработчик для кнопки "Отмена" при редактировании
    cancelEditBtn.addEventListener('click', function() {
        // Сбрасываем форму к состоянию "создание"
        resetFormToCreate();
    });

    // Функция для сброса формы к состоянию "создание"
    function resetFormToCreate() {
        form.reset(); // Сбрасывает все поля ввода к начальному состоянию
        formActionInput.value = 'create';
        userIdInput.value = ''; // Очищаем ID пользователя
        modalTitle.textContent = 'Создать нового пользователя';
        submitBtn.textContent = 'Создать';
        closeModalBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'none';
        // Не трогаем пароль, так как при создании он всегда required
    }
});