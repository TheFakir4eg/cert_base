// /static/js/certificates/cert_templates/ct_action.js

import { fetchAvailableFiles, deleteTemplate, fetchActiveTemplateVersions } from "./ct_api.js";
import { renderTemplates } from "./ct_render.js";

/**
Инициализирует обработчики компонента макетов.
@param {Object} state
@param {Object} dom
*/
export function initTemplateActions(state,dom) {
    initAddTemplateAction(state,dom);
    initDeleteTemplateAction(state,dom);
    initSelectModalFocus(dom);
}

function initSelectModalFocus(dom) {
    if (!dom.selectModal) {
        return;
    }

    dom.selectModal.addEventListener(
        "hidden.bs.modal",
        () => {
            if (
                document.activeElement &&
                dom.selectModal.contains(document.activeElement)
            ) {
                document.activeElement.blur();
            }
        }
    );
}
/**
Обработчик кнопки "Добавить макет".
Загружает доступные файлы и открывает модалку выбора.
@param {Object} state
@param {Object} dom
*/
function initAddTemplateAction(state,dom) {
    dom.addButton.addEventListener("click",async () => {
        try {
            //state.availableFiles = await fetchAvailableFiles();
            state.availableTemplates = await fetchActiveTemplateVersions();
            //console.log( "Доступные макеты:", state.availableFiles);
            console.log( "Доступные макеты:", state.availableTemplates);
            openSelectModal( state, dom);
        } catch (error) {

            console.error(
                "Ошибка загрузки файлов макетов:",
                error
            );

            showTemplateError( error.message);
        }
    }

    );
}

/**
Открывает модалку выбора файла.
@param {Object} state
@param {Object} dom
*/
function openSelectModal(state,dom) {
    if (!dom.selectModal) {
        console.error( "Модалка выбора макета не найдена");
        return;
    }
    console.log(
        "Модалка:",
        dom.selectModal
    );

    console.log(
        "Контейнер файлов:",
        dom.files
    );
    renderAvailableFiles(state,dom);
    const modal = bootstrap.Modal.getOrCreateInstance( dom.selectModal );
    modal.show();
}

/**
Отображает доступные файлы.
@param {Object} state
@param {Object} dom
*/
// function renderAvailableFiles(state,dom) {
//     console.log( "renderAvailableFiles:", state.availableFiles);
//     dom.files.innerHTML = "";

//     if ( !state.availableFiles || !state.availableFiles.length) {
//         dom.files.textContent = "Доступные макеты не найдены.";
//         return;
//     }

//     for ( const folder of state.availableFiles) {
//         renderFolder(folder, state, dom);
//     }
// }

function renderAvailableFiles(state, dom) {
    dom.files.innerHTML = "";

    if ( !state.availableTemplates || !state.availableTemplates.length
    ) {
        dom.files.textContent = "Активные версии макетов не найдены.";
        return;
    }
    for ( const templateVersion of state.availableTemplates) 
    {
        const card = createTemplateVersionCard( templateVersion, state, dom);
        dom.files.appendChild(card);
    }
}

/**
Отображает папку с файлами.
@param {Object} folder
@param {Object} state
@param {Object} dom
*/
function renderFolder(folder,state,dom) {
    const folderBlock = document.createElement( "div");
    folderBlock.className = "certificate-template-folder";

    const folderTitle = document.createElement("h6");
    folderTitle.className = "certificate-template-folder-title";
    folderTitle.textContent = folder.folder;
    folderBlock.appendChild( folderTitle);

    const files = document.createElement("div");
    files.className = "row g-3";

    for ( const file of folder.files) {
        const card = createFileCard(folder.folder, file, state, dom);
        files.appendChild( card);
    }

    folderBlock.appendChild( files);
    dom.files.appendChild(folderBlock);
}

/**

Создаёт карточку доступного файла.


@param {string} folderPath
@param {Object} file
@param {Object} state
@param {Object} dom



@returns {HTMLElement}
*/
function createFileCard(folderPath,file,state,dom) {
    const column = document.createElement( "div");
    column.className = "col-md-4";

    const card = document.createElement("button");
    card.type ="button";
    card.className = "certificate-template-file-card";

    const filename = document.createElement("div");
    filename.className = "certificate-template-file-name";
    filename.textContent = file.filename;

    card.appendChild( filename);
    card.addEventListener( "click", () => {
            selectFile( folderPath, file, state, dom);
        }
    );

    column.appendChild( card);
    return column;
}

/**
Обрабатывает выбор файла.
@param {string} folderPath
@param {Object} file
@param {Object} state
@param {Object} dom
*/
function selectFile(folderPath, file, state, dom) {
    const name = createTemplateName( file.filename);

    const template = {
            name,
            folder_path: folderPath,
            filename: file.filename,
        };

    state.pendingTemplates.push( template);

    renderTemplates(state, dom);
    closeSelectModal(dom);
}

/**
Создаёт понятное имя макетаиз имени файла.
Например:

front.jpg
↓
front
certificate-front.png
↓
certificate-front

@param {string} filename
@returns {string}
*/
function createTemplateName(filename) {
    return filename.replace(/.[^/.]+$/, "");
}

/**

Инициализирует удаление макетов.


Используется делегирование событий,
потому что карточки создаются динамически.


@param {Object} state

@param {Object} dom
*/
function initDeleteTemplateAction(state,dom) {
    dom.container.addEventListener( "click", async (event) => {
        const button = event.target.closest('[data-action="delete-template"]');

        if (!button) {
            return;
        }
        const templateId = button.dataset.templateId;
        const pendingIndex = button.dataset.pendingIndex;

        if (templateId) {
            await deleteSavedTemplate(templateId, state, dom);
            return;
        }

        if ( pendingIndex !== undefined) {
            deletePendingTemplate(Number(pendingIndex), state, dom);
        }
    }

    );
}

/**

Удаляет сохранённый макет.
@param {string|number} templateId
@param {Object} state
@param {Object} dom
*/
async function deleteSavedTemplate(templateId,state,dom) {
    try {
        //await deleteTemplate(templateId);
        // Добавляем ID в список на удаление (приводим к строке для надежного сравнения)
        state.deletedTemplateIds.add(String(templateId));
        state.templates = state.templates.filter( template => String(template.id) !== String( templateId));

        renderTemplates( state, dom);

    } catch (error) {
        console.error(
            "Ошибка удаления макета:",
            error
        );
        showTemplateError( error.message);
    }
}

/**
Удаляет временный макет.
@param {number} index
@param {Object} state
@param {Object} dom
*/
function deletePendingTemplate(index,state,dom) {
    state.pendingTemplates.splice(index,1);
    renderTemplates(state,dom);
}

/**
Закрывает модалку выбора файла.
@param {Object} dom
*/
function closeSelectModal(dom) {
    if (!dom.selectModal) {
        return;
    }
    const modal = bootstrap.Modal.getInstance(dom.selectModal);

    if (modal) {
        modal.hide();
    }
}

/**

Показывает ошибку.

Пока используем простой alert.
Позже можно заменить на общий toast приложения.
@param {string} message
*/
function showTemplateError(message) {
    alert(
        message ||
        "Произошла ошибка"
    );
}

function createTemplateVersionCard( templateVersion, state, dom) 
{
    const column = document.createElement("div");
    column.className = "col-md-4";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "certificate-template-file-card";

    const name = document.createElement("div");
    name.className = "certificate-template-file-name";
    name.textContent = templateVersion.template_name;

    const version = document.createElement("div");
    version.className = "text-muted small";
    version.textContent = `Версия ${templateVersion.version}`;

    const filename = document.createElement("div");
    filename.className = "text-muted small";
    filename.textContent = templateVersion.filename;

    card.append( name, version, filename);
    card.addEventListener( "click", () => { selectTemplateVersion( templateVersion, state, dom);});
    column.appendChild(card);
    return column;
}

function selectTemplateVersion( templateVersion, state, dom)
{
    const template = {
        // Идентификаторы сущностей БД
        template_version_id: templateVersion.id,
        template_id: templateVersion.template_id,
        // Информация для отображения
        name: templateVersion.template_name,
        code: templateVersion.template_code,
        version: templateVersion.version,
        filename: templateVersion.filename,
        folder_path: templateVersion.folder_path,
        // Источник
        source: "pending",
    };
    state.pendingTemplates.push(template);
    renderTemplates(state, dom);
    closeSelectModal(dom);
}