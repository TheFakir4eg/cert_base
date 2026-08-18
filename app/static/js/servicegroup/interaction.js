document.addEventListener('DOMContentLoaded', function() {
    const modalEl = document.getElementById('serviceGroupModal');
    const sgModal = new bootstrap.Modal(modalEl);

    const formAction = document.getElementById('form_action');
    const formId = document.getElementById('form_sg_id');
    const inputName = document.getElementById('name');
    const inputNote = document.getElementById('note');
    
    const modalTitle = document.getElementById('serviceGroupModalLabel');
    const btnSubmit = document.getElementById('btn-submit');

    // --- 1. Создание новой группы ---
    document.getElementById('btn-create-group').addEventListener('click', function() {
        modalTitle.textContent = 'Создать новую группу';
        btnSubmit.textContent = 'Создать';
        
        formAction.value = 'create';
        formId.value = '';
        
        inputName.value = '';
        inputNote.value = '';
        
        sgModal.show();
    });

    // --- 2. Редактирование существующей группы ---
    document.querySelectorAll('.edit-group-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sgId = this.getAttribute('data-servicegroup-id');
            const sgName = this.getAttribute('data-servicegroup-name');
            const sgNote = this.getAttribute('data-servicegroup-note');

            modalTitle.textContent = 'Редактировать группу';
            btnSubmit.textContent = 'Сохранить';
            
            formAction.value = 'edit';
            formId.value = sgId;
            
            inputName.value = sgName;
            inputNote.value = sgNote;
            
            sgModal.show();
        });
    });

    // --- 3. Удаление группы ---
    document.querySelectorAll('.delete-group-btn').forEach(button => {
        button.addEventListener('click', function() {
            const sgId = this.getAttribute('data-servicegroup-id');
            const sgName = this.getAttribute('data-servicegroup-name');

            // Обновленный текст подтверждения
            if (confirm(`Вы уверены, что хотите удалить группу "${sgName}"?\n\nВнимание: Удаление невозможно, если в группе есть услуги или сертификаты.`)) {
                
                const form = document.createElement('form');
                form.method = 'POST';
                form.action = window.location.pathname;

                const actionInput = document.createElement('input');
                actionInput.type = 'hidden';
                actionInput.name = 'action';
                actionInput.value = 'delete';
                form.appendChild(actionInput);

                const idInput = document.createElement('input');
                idInput.type = 'hidden';
                idInput.name = 'servicegroup_id';
                idInput.value = sgId;
                form.appendChild(idInput);

                document.body.appendChild(form);
                form.submit();
            }
        });
    });
});