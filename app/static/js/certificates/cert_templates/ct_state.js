// /static/js/certificates/cert_templates/ct_state.js

export const templateState = {
    certificateId: null,
    templates: [],
    pendingTemplates: [],
    availableFiles: [],
    availableFolders: [],
    availableTemplates: [],
    selectedFolder: null,
    selectedFile: null,
    initialTemplates: [],      // Снимок состояния при загрузке (для кнопки "Отмена")
    deletedTemplateIds: new Set(), // Храним ID макетов, которые нужно удалить
};

export function createTemplateState() {
    return {
        certificateId: null,
        templates: [], // Уже сохранённые в БД макеты
        availableFiles: [], // Доступные файлы на сервере  
        availableTemplates: [],
        pendingTemplates: [], // Выбранные пользователем файлы
        selectedFolder: null,
        selectedFile: null,
        initialTemplates: [],      // Снимок состояния при загрузке (для кнопки "Отмена")
        deletedTemplateIds: new Set(), // Храним ID макетов, которые нужно удалить
    };
}