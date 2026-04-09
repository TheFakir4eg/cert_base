// static/js/groupManager.js
class GroupManager {
    constructor() {
        this.modal = null;
        this.currentGroupId = null;
        this.init();
    }
    
    init() {
        // Инициализация модального окна
        this.modal = new bootstrap.Modal(document.getElementById('groupModal'));
        
        // Обработчики событий
        document.querySelectorAll('.edit-group-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openEditModal(e.target.closest('.edit-group-btn').dataset.groupId));
        });
        
        document.getElementById('createGroupBtn')?.addEventListener('click', () => this.openCreateModal());
        
        // Глобальный обработчик для закрытия
        document.getElementById('groupModal').addEventListener('hidden.bs.modal', () => {
            this.clearModal();
        });
    }
    
    async openEditModal(groupId) {
        this.currentGroupId = groupId;
        await this.loadGroupData(groupId);
        this.modal.show();
    }
    
    async openCreateModal() {
        this.currentGroupId = null;
        await this.loadEmptyForm();
        this.modal.show();
    }
    
    async loadGroupData(groupId) {
        try {
            const response = await fetch(`/groups/${groupId}`);
            if (!response.ok) throw new Error('Ошибка загрузки');
            
            const data = await response.json();
            this.renderForm(data);
        } catch (error) {
            this.showError('Ошибка загрузки данных группы');
            console.error(error);
        }
    }
    
    async loadEmptyForm() {
        try {
            const response = await fetch('/groups/empty-form');
            const html = await response.text();
            document.getElementById('groupModalBody').innerHTML = html;
            document.getElementById('groupModalTitle').textContent = 'Создать группу доступа';
            this.attachFormHandlers();
        } catch (error) {
            this.showError('Ошибка загрузки формы');
        }
    }
    
    renderForm(data) {
        // Здесь рендерим форму с данными
        // Можно использовать шаблонизацию или загружать HTML с сервера
        document.getElementById('groupModalTitle').textContent = `Редактирование группы: ${data.name}`;
        
        // Загружаем HTML формы
        fetch('/groups/form-template')
            .then(response => response.text())
            .then(html => {
                document.getElementById('groupModalBody').innerHTML = html;
                this.fillFormData(data);
                this.attachFormHandlers();
            });
    }
    
    fillFormData(data) {
        // Заполняем форму данными
        document.getElementById('groupName').value = data.name;
        
        // Заполняем разрешения
        if (data.permissions) {
            data.permissions.forEach(perm => {
                this.addPermissionRow(perm.resource_id, perm.permission_type);
            });
        }
        
        // Заполняем пользователей
        if (data.users) {
            data.users.forEach(user => {
                this.addUserToGroup(user.id, user.name);
            });
        }
    }
    
    attachFormHandlers() {
        // Обработчик сохранения
        document.getElementById('saveGroupBtn')?.addEventListener('click', () => this.saveGroup());
        
        // Обработчики для добавления/удаления разрешений
        document.getElementById('addPermissionBtn')?.addEventListener('click', () => this.addPermissionRow());
        
        // Обработчики для добавления/удаления пользователей
        document.getElementById('addUserBtn')?.addEventListener('click', () => this.openUserSearch());
    }
    
    async saveGroup() {
        const formData = new FormData();
        
        if (this.currentGroupId) {
            formData.append('action', 'edit');
            formData.append('group_id', this.currentGroupId);
        } else {
            formData.append('action', 'create');
        }
        
        formData.append('group_name', document.getElementById('groupName').value);
        
        // Собираем разрешения
        const permissions = [];
        document.querySelectorAll('.permission-row').forEach(row => {
            const resourceId = row.querySelector('.resource-select').value;
            const permissionType = row.querySelector('.permission-type-select').value;
            if (resourceId && permissionType) {
                permissions.push({ resource_id: resourceId, permission_type: permissionType });
            }
        });
        formData.append('permissions', JSON.stringify(permissions));
        
        try {
            const response = await fetch('/api/groups/save', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.modal.hide();
                this.showSuccess('Группа успешно сохранена');
                setTimeout(() => location.reload(), 1500);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            this.showError('Ошибка сохранения');
            console.error(error);
        }
    }
    
    addPermissionRow(resourceId = '', permissionType = '') {
        // Логика добавления строки разрешения
        const container = document.getElementById('permissionsContainer');
        const template = document.getElementById('permissionRowTemplate');
        const newRow = template.content.cloneNode(true);
        
        if (resourceId) {
            newRow.querySelector('.resource-select').value = resourceId;
        }
        if (permissionType) {
            newRow.querySelector('.permission-type-select').value = permissionType;
        }
        
        container.appendChild(newRow);
    }
    
    addUserToGroup(userId, userName) {
        // Логика добавления пользователя
    }
    
    openUserSearch() {
        // Логика поиска пользователей
    }
    
    clearModal() {
        document.getElementById('groupModalBody').innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
            </div>
        `;
        this.currentGroupId = null;
    }
    
    showError(message) {
        alert(message);
    }
    
    showSuccess(message) {
        alert(message);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.groupManager = new GroupManager();
});