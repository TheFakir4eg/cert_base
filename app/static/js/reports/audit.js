// app/static/js/reports/audit.js

function showChanges(logId) {
    const modal = new bootstrap.Modal(document.getElementById('changesModal'));
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
            if (!response.ok) throw new Error('Ошибка загрузки');
            return response.json();
        })
        .then(data => {
            renderChanges(data);
        })
        .catch(err => {
            content.innerHTML = `
                <div class="alert alert-danger">
                    Не удалось загрузить данные: ${err.message}
                </div>
            `;
        });
}

// function renderChanges(data) {
//     const content = document.getElementById('changesContent');
    
//     let html = `
//         <p><strong>Дата:</strong> ${data.created_at || '—'}</p>
//         <p><strong>Пользователь:</strong> ${data.user_name || '—'}</p>
//         <p><strong>Действие:</strong> <span class="badge bg-${data.action === 'create' ? 'success' : data.action === 'update' ? 'warning' : 'danger'}">${data.action}</span></p>
//         <p><strong>Объект:</strong> ${data.entity_type} #${data.entity_id || '—'}</p>
//     `;

//     if (data.comment) {
//         html += `<p><strong>Комментарий:</strong> ${data.comment}</p>`;
//     }

//     // Old / New данные
//     if (data.old_data || data.new_data) {
//         html += `<hr><h6>Изменения:</h6>`;
        
//         const oldData = data.old_data ? `<pre class="bg-light p-3"><small>${JSON.stringify(data.old_data, null, 2)}</small></pre>` : '<p class="text-muted">Нет старых данных</p>';
//         const newData = data.new_data ? `<pre class="bg-light p-3"><small>${JSON.stringify(data.new_data, null, 2)}</small></pre>` : '<p class="text-muted">Нет новых данных</p>';

//         html += `
//             <div class="row">
//                 <div class="col-md-6">
//                     <strong>Было:</strong>
//                     ${oldData}
//                 </div>
//                 <div class="col-md-6">
//                     <strong>Стало:</strong>
//                     ${newData}
//                 </div>
//             </div>
//         `;
//     }

//     content.innerHTML = html;
// }
function renderChanges(data) {
    const content = document.getElementById('changesContent');
    
    let html = `
        <p><strong>Дата:</strong> ${data.created_at || '—'}</p>
        <p><strong>Пользователь:</strong> ${data.user_name || '—'}</p>
        <p><strong>Действие:</strong> <span class="badge bg-${data.action === 'create' ? 'success' : data.action === 'update' ? 'warning' : 'danger'}">${data.action}</span></p>
        <p><strong>Объект:</strong> ${data.entity_type} #${data.entity_id || '—'}</p>
    `;

    if (data.comment) {
        html += `<p><strong>Комментарий:</strong> ${data.comment}</p>`;
    }

    // Изменённые поля
    if (data.changes && data.changes.length > 0) {
        html += `<hr><h6>Изменённые поля:</h6>`;
        html += `<table class="table table-sm table-bordered">`;
        html += `<thead><tr><th>Поле</th><th>Было</th><th>Стало</th></tr></thead><tbody>`;

        data.changes.forEach(change => {
            html += `
                <tr>
                    <td><strong>${change.field}</strong></td>
                    <td class="text-danger">${change.old !== null && change.old !== undefined ? change.old : '—'}</td>
                    <td class="text-success">${change.new !== null && change.new !== undefined ? change.new : '—'}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
    } 
    else if (data.action === 'create' && data.new_data) {
        html += `<hr><h6>Созданные данные:</h6><pre class="bg-light p-3"><small>${JSON.stringify(data.new_data, null, 2)}</small></pre>`;
    }
    else {
        html += `<hr><p class="text-muted">Нет изменений для отображения.</p>`;
    }

    content.innerHTML = html;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Audit JS loaded');
});