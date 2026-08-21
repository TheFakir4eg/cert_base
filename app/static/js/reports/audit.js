// app/static/js/reports/audit.js

function showChanges(logId) {
    const modalElement = document.getElementById('changesModal');
    const modal = new bootstrap.Modal(modalElement);
    const content = document.getElementById('changesContent');
    content.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
        </div>
    `;
    modal.show();
    fetch(`/reports/audit/log/${logId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Ошибка загрузки');
            }
            return response.json();
        })
        .then(data => { renderChanges(data);})
        .catch(err => {
            content.innerHTML = `
                <div class="alert alert-danger">
                    Не удалось загрузить данные: ${escapeHtml(err.message)}
                </div>
            `;
        });
}


/**
 * Экранирование HTML.
 * Данные аудита приходят с сервера и не должны напрямую
 * вставляться в innerHTML.
 */
function escapeHtml(value) {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}


/**
 * Красивое отображение значения обычного поля.
 */
function formatValue(value) {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    if (typeof value === 'object') {
        return escapeHtml(JSON.stringify(value));
    }
    return escapeHtml(value);
}


/**
 * Названия полей аудита.
 */
const fieldNames = {
    certificate_id: 'Сертификат',
    client_id: 'Клиент',
    user_id: 'Пользователь',
    edit_user_id: 'Изменил',
    issue_date: 'Дата выдачи',
    issue_place_id: 'Место выдачи',
    active: 'Активен',
    note: 'Примечание',
    comment: 'Комментарий',
    items: 'Услуги'
};


/**
 * Названия действий.
 */
const actionNames = {
    issue: 'Выдача',
    update: 'Изменение',
    close: 'Вывод',
    restore: 'Восстановление',
    transaction: 'Списание'
};


/**
 * CSS-класс badge для действия.
 */
function getActionBadgeClass(action) {
    switch (action) {
        case 'issue':
            return 'success';
        case 'create':
            return 'success';
        case 'update':
            return 'warning';
        case 'close':
            return 'danger';
        case 'restore':
            return 'info';
        case 'transaction':
            return 'primary';
        default:
            return 'secondary';
    }
}


/**
 * Отображение bool.
 */
function formatBoolean(value) {
    if (value === true) {
        return 'Да';
    }
    if (value === false) {
        return 'Нет';
    }
    return '—';
}


/**
 * Отрисовка списка услуг транзакции.
 */
function renderTransactionItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        return `
            <p class="text-muted mb-0">
                Услуги не указаны.
            </p>
        `;
    }

    let html = `
        <table class="table table-sm table-bordered align-middle mb-0">
            <thead class="table-light">
                <tr>
                    <th>Услуга</th>
                    <th class="text-end">Количество</th>
                    <th class="text-end">Цена</th>
                    <th class="text-end">Сумма</th>
                </tr>
            </thead>
            <tbody>
    `;

    let total = 0;
    items.forEach(item => {
        const amount = Number(item.amount);
        if (!Number.isNaN(amount)) {
            total += amount;
        }
        html += `
            <tr>
                <td> ${escapeHtml(item.service_name || '—')}</td>
                <td class="text-end"> ${escapeHtml(item.quantity ?? '—')}</td>
                <td class="text-end">  ${escapeHtml(item.price ?? '—')}</td>
                <td class="text-end">
                    <strong> ${escapeHtml(item.amount ?? '—')}</strong>
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;
    return html;
}


/**
 * Специальное отображение транзакции.
 */
function renderTransaction(data) {
    const newData = data.new_data || {};

    let html = `
        <hr>

        <h6 class="mb-3">
            Списание по сертификату
        </h6>

        <div class="row mb-3">

            <div class="col-md-4">
                <strong>Сертификат:</strong><br>
                #${escapeHtml(newData.certificate_id ?? '—')}
            </div>

            <div class="col-md-4">
                <strong>Клиент:</strong><br>
                #${escapeHtml(newData.client_id ?? '—')}
            </div>

            <div class="col-md-4">
                <strong>Пользователь:</strong><br>
                #${escapeHtml(newData.user_id ?? '—')}
            </div>

        </div>
    `;

    if (newData.comment) {
        html += `
            <div class="mb-3">
                <strong>Комментарий:</strong><br>
                ${escapeHtml(newData.comment)}
            </div>
        `;
    }

    html += `
        <div class="mb-2">
            <strong>Списанные услуги:</strong>
        </div>

        ${renderTransactionItems(newData.items)}
    `;

    return html;
}


/**
 * Отрисовка обычных изменений.
 */
function renderFieldChanges(data) {
    if (!data.changes || data.changes.length === 0) {
        return `
            <hr>
            <p class="text-muted">
                Нет изменений для отображения.
            </p>
        `;
    }

    let html = `
        <hr>
        <h6 class="mb-3">Изменения</h6>

        <div class="table-responsive">
            <table class="table table-sm table-bordered align-middle">
                <thead class="table-light">
                    <tr>
                        <th>Поле</th>
                        <th>Было</th>
                        <th>Стало</th>
                    </tr>
                </thead>
                <tbody>
    `;

    data.changes.forEach(change => {
        let oldValue = change.old;
        let newValue = change.new;

        // Для boolean показываем Да/Нет
        if (typeof oldValue === 'boolean') {
            oldValue = formatBoolean(oldValue);
        }

        if (typeof newValue === 'boolean') {
            newValue = formatBoolean(newValue);
        }

        html += `
            <tr>
                <td>
                    <strong> ${escapeHtml( fieldNames[change.field] || change.field )} </strong>
                </td>
                <td class="text-danger"> ${formatValue(oldValue)}</td>
                <td class="text-success"> ${formatValue(newValue)}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    return html;
}


/**
 * Основная функция отрисовки аудита.
 */
function renderChanges(data) {
    const content = document.getElementById('changesContent');
    const actionName = actionNames[data.action] || data.action || '—';
    const badgeClass = getActionBadgeClass(data.action);
    let html = `
        <div class="mb-3">

            <p class="mb-2">
                <strong>Дата:</strong>
                ${escapeHtml(data.created_at || '—')}
            </p>

            <p class="mb-2">
                <strong>Пользователь:</strong>
                ${escapeHtml(data.user_name || '—')}
            </p>

            <p class="mb-2">
                <strong>Действие:</strong>
                <span class="badge bg-${badgeClass}">
                    ${escapeHtml(actionName)}
                </span>
            </p>

            <p class="mb-2">
                <strong>Объект:</strong>
                ${escapeHtml(data.entity_type || '—')}
                #${escapeHtml(data.entity_id || '—')}
            </p>

        </div>
    `;

    if (data.comment) {
        html += `
            <div class="alert alert-light border mb-3">
                <strong>Комментарий:</strong><br>
                ${escapeHtml(data.comment)}
            </div>
        `;
    }

    /*
     * Транзакция имеет специальную структуру.
     */
    if (
        data.action === 'transaction' &&
        data.new_data
    ) {
        html += renderTransaction(data);
    }

    /*
     * Остальные действия отображаем как обычные изменения.
     */
    else {
        html += renderFieldChanges(data);
    }

    content.innerHTML = html;
}


// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    console.log('Audit JS loaded');
});