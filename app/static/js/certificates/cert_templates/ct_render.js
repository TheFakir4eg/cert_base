// /static/js/certificates/cert_templates/ct_render.js
// renderTemplates()
//     ├── renderEmptyState()
//     └── renderTemplateCard()

export function renderTemplates(state, dom) {
    // console.log("Рендер макетов:", {
    //     templates: state.templates,
    //     pendingTemplates: state.pendingTemplates,
    //     container: dom.container,
    //     empty: dom.empty,
    // });
    dom.container.innerHTML = "";

    // 1. Берем только те сохраненные макеты, которые НЕ помечены на удаление
    const visibleSavedTemplates = state.templates
        .filter(template => !state.deletedTemplateIds.has(String(template.id)))
        .map(template => ({
            ...template,
            source: "saved",
        }));

    // const savedTemplates =
    //     state.templates.map(template => ({
    //         ...template,
    //         source: "saved",
    //     }));

    const pendingTemplates =
        state.pendingTemplates.map(
            (template, index) => ({
                ...template,
                source: "pending",
                pendingIndex: index,
            })
        );

    const templates = [
        //...savedTemplates,
        ...visibleSavedTemplates,
        ...pendingTemplates,
    ];

    if (!templates.length) {
        renderEmptyState(dom);
        return;
    }

    for (const template of templates) {
        const card = renderTemplateCard(template);
        dom.container.appendChild(card);
    }
}


function renderEmptyState(dom) {
    const empty = document.createElement("div");
    empty.className = "certificate-templates-empty " + "text-muted small";
    empty.textContent = "Макеты не добавлены";
    dom.container.appendChild(empty);
}

function renderTemplateCard(template) {
    const card = document.createElement("div");
    card.className = "certificate-template-card";

    if (template.source === "saved") {
        card.dataset.templateId = template.id;
    }
    if (template.source === "pending") {
        card.dataset.pendingIndex = template.pendingIndex;
    }

    const preview = createPreview(template);
    const info = createTemplateInfo(template);
    const deleteButton = createDeleteButton(template);

    card.append(
        preview,
        info,
        deleteButton
    );
    return card;
}

function createPreview(template) {
    const wrapper = document.createElement("div");
    wrapper.className = "certificate-template-preview";

    const placeholder = document.createElement("div");
    placeholder.className = "certificate-template-preview-placeholder";
    placeholder.textContent = "Макет сертификата";
    wrapper.appendChild(placeholder);
    return wrapper;
}

// function createPreview(template) {
//     const wrapper = document.createElement("div");
//     wrapper.className = "certificate-template-preview";

//     if (!template.url) {
//         wrapper.classList.add( "certificate-template-preview-pending");
//         const placeholder = document.createElement("div");
//         placeholder.className = "certificate-template-preview-placeholder";
//         placeholder.textContent = "Предпросмотр появится после сохранения";
//         wrapper.appendChild( placeholder);
//         return wrapper;
//     }

//     if (isImageFile(template.filename)) {
//         const image = document.createElement("img");
//         image.src = template.url;
//         image.alt = template.name || template.filename;
//         image.className = "certificate-template-image";
//         image.loading = "lazy";
//         image.addEventListener(
//             "click",
//             () => {
//                 window.open(
//                     template.url,
//                     "_blank"
//                 );
//             }
//         );
//         wrapper.appendChild(image);
//         return wrapper;
//     }

//     if (isPdfFile(template.filename)) {
//         const link = document.createElement("a");
//         link.href = template.url;
//         link.target = "_blank";
//         link.rel = "noopener noreferrer";
//         link.className = "certificate-template-pdf-link";
//         link.textContent = "Открыть PDF";
//         wrapper.appendChild(link);
//         return wrapper;
//     }

//     const link = document.createElement("a");
//     link.href = template.url;
//     link.target = "_blank";
//     link.rel = "noopener noreferrer";
//     link.textContent = "Открыть файл";
//     wrapper.appendChild(link);
//     return wrapper;
// }

/**
Создаёт информационный блок макета.
@param {Object} template
@returns {HTMLElement}
*/
function createTemplateInfo(template) {
    const info = document.createElement("div");
    info.className = "certificate-template-info";

    // Название шаблона
    const name = document.createElement("div");
    name.className = "certificate-template-name";
    name.textContent =
        template.name ||
        template.template_name ||
        "Без названия";

    info.appendChild(name);

    // Код шаблона
    const code = template.code || template.template_code;

    if (code) {
        const codeElement = document.createElement("div");
        codeElement.className = "certificate-template-code text-muted small";
        codeElement.textContent = `Код: ${code}`;
        info.appendChild(codeElement);
    }

    // Версия
    if (template.version !== undefined) {
        const version = document.createElement("div");
        version.className = "certificate-template-version text-muted small";
        version.textContent = `Версия: ${template.version}`;
        info.appendChild(version);
    }

    // Файл
    if (template.filename) {
        const filename = document.createElement("div");
        filename.className = "certificate-template-filename text-muted small";
        filename.textContent = `Файл: ${template.filename}`;
        info.appendChild(filename);
    }

    // Статус pending
    if (template.source === "pending") {
        const status = document.createElement("div");
        status.className = "certificate-template-status text-muted small";
        status.textContent = "Будет сохранён после создания сертификата";
        info.appendChild(status);
    }

    return info;
}
// function createTemplateInfo(template) {
//     const info = document.createElement("div");
//     info.className = "certificate-template-info";

//     const name = document.createElement("div");
//     name.className = "certificate-template-name";
//     name.textContent = template.name || "Без названия";

//     const filename = document.createElement("div");
//     filename.className = "certificate-template-filename " + "text-muted small";
//     filename.textContent = template.filename;

//     info.append( name, filename);

//     if (template.source === "pending") {
//         const status = document.createElement("div");
//         status.className = "certificate-template-status " + "text-muted small";
//         status.textContent = "Будет сохранён после создания сертификата";
//         info.appendChild(status);
//     }

//     return info;
// }


/**

Создаёт кнопку удаления.
Кнопка сама ничего не удаляет.
Она только получает: data-template-id или: data-pending-index
чтобы ct_action.js мог определить,
что именно нужно удалить.

@param {Object} template
@returns {HTMLButtonElement}
*/
function createDeleteButton(template) {

    const button = document.createElement("button");
    button.type = "button";
    //button.className = "btn btn-sm btn-outline-danger";
    button.className = "icon-btn-ghost";
    button.title = "Удалить макет";
    button.dataset.action = "delete-template";

    const icon = document.createElement("i");
    icon.className = "bi bi-x-circle"; // Можно также использовать "bi bi-trash" или "bi bi-x-circle-fill"
    
    // Вкладываем иконку внутрь кнопки
    button.appendChild(icon);
    //button.textContent = "Удалить";

    if (template.source === "saved") {
        button.dataset.templateId = template.id;
    }

    if (template.source === "pending") {
        button.dataset.pendingIndex = template.pendingIndex;
    }

    return button;
}

/**
Проверяет, является ли файл изображением.
@param {string} filename
@returns {boolean}
*/
function isImageFile(filename) {
    if (!filename) {
        return false;
    }
    const extension = filename.split(".").pop().toLowerCase();

    return [
        "jpg",
        "jpeg",
        "png",
        "webp",
        ].includes(extension);
}

/**

Проверяет, является ли файл PDF.
@param {string} filename
@returns {boolean}
*/
function isPdfFile(filename) {
    if (!filename) {
        return false;
    }

    return filename.toLowerCase().endsWith(".pdf");
}
// function isImageFile( filename) {
//     const extension = filename.split(".").pop().toLowerCase();
//     return [
//         "jpg",
//         "jpeg",
//         "png",
//         "webp",
//     ].includes(
//         extension
//     );
// }