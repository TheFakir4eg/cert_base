// app/static/js/utils.js



// Глобальная переменная для хранения ссылки на форму, которую нужно отправить
let confirmFormToSubmit = null;

// Функция для инициализации обработчиков для кнопок подтверждения
function setupConfirmModal() {
    // Находим все кнопки, которые должны вызывать модальное окно подтверждения
    // Используем атрибут data-confirm, чтобы их идентифицировать
    const confirmButtons = document.querySelectorAll('[data-confirm]');
    
    confirmButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            event.preventDefault(); // Останавливаем стандартное поведение (например, переход по ссылке)

            // Получаем данные из атрибутов кнопки
            const title = button.getAttribute('data-confirm-title') || 'Подтвердите действие';
            const text = button.getAttribute('data-confirm-text') || 'Вы уверены?';
            const formId = button.getAttribute('data-confirm-form-id');

            // Находим элементы модального окна
            const modalTitle = document.getElementById('confirmActionModalLabel');
            const modalText = document.getElementById('confirmActionModalText');
            const modalConfirmBtn = document.getElementById('confirmActionModalBtn');

            // Заполняем модальное окно
            modalTitle.textContent = title;
            modalText.textContent = text;

            // Сохраняем ссылку на форму для последующей отправки
            if (formId) {
                confirmFormToSubmit = document.getElementById(formId);
            } else {
                // Если formId не указан, попробуем найти форму в родительском элементе
                confirmFormToSubmit = button.closest('form');
            }

            // Открываем модальное окно
            const confirmModal = new bootstrap.Modal(document.getElementById('confirmActionModal'));
            confirmModal.show();

            // Назначаем обработчик для кнопки "Да"
            modalConfirmBtn.onclick = function() {
                if (confirmFormToSubmit) {
                    // Отправляем форму
                    confirmFormToSubmit.submit();
                }
                // Закрываем модальное окно (это делается автоматически после submit, но на всякий случай)
                confirmModal.hide();
            };
        });
    });
}

// автоматическое скрытие flash-уведомлений с таймером в 5 секунд
document.addEventListener('DOMContentLoaded', function() {
    // Находим контейнер с уведомлениями
    const flashMessagesContainer = document.getElementById('flash-messages');

    // Проверяем, существует ли контейнер (на случай, если уведомлений не было)
    if (flashMessagesContainer) {
        // Находим все уведомления внутри контейнера
        const alerts = flashMessagesContainer.querySelectorAll('.alert[data-auto-dismiss]');

        // Перебираем найденные уведомления
        alerts.forEach(function(alertElement) {
            // Получаем время задержки из атрибута data-auto-dismiss (в миллисекундах)
            const autoDismissDelay = parseInt(alertElement.getAttribute('data-auto-dismiss'));

            // Проверяем, является ли значение числом
            if (!isNaN(autoDismissDelay)) {
                // Устанавливаем таймер
                setTimeout(function() {
                    // Проверяем, существует ли элемент (вдруг пользователь закрыл его вручную до истечения таймера)
                    if (alertElement && typeof bootstrap !== 'undefined' && bootstrap.Alert) {
                        // Получаем экземпляр Alert компонента Bootstrap для этого элемента
                        const bsAlertInstance = bootstrap.Alert.getInstance(alertElement);
                        // Если экземпляр существует, вызываем его метод close
                        if (bsAlertInstance) {
                            bsAlertInstance.close();
                        } else {
                            // Альтернатива: если getInstance не работает или Alert не инициализирован автоматически
                            // bootstrap.Alert.getOrCreateInstance(alertElement).close();
                            // Или просто вызвать метод напрямую, как делает Bootstrap при клике на кнопку закрытия
                            const closeButton = alertElement.querySelector('[data-bs-dismiss="alert"]');
                            if (closeButton) {
                                // Имитируем клик по кнопке закрытия
                                // closeButton.click();
                                // Или вызываем метод напрямую для alert элемента
                                bootstrap.Alert.getOrCreateInstance(alertElement).close();
                            } else {
                                // Если кнопки закрытия нет, просто вызываем close на alert элементе
                                bootstrap.Alert.getOrCreateInstance(alertElement).close();
                            }
                        }
                    }
                }, autoDismissDelay);
            }
        });
    }
    // Инициализируем обработчики для модального окна подтверждения
    setupConfirmModal();
});

function showFlash(message, type="success") {
    const container = document.getElementById("flash-container");

    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show shadow`;
    alert.role = "alert";
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(alert);

    // автозакрытие
    setTimeout(() => {
        alert.classList.remove("show");
        alert.classList.add("hide");
        setTimeout(() => alert.remove(), 500);
    }, 2500);
}