// /static/js/certificates/cert_templates/ct_api.js

//Получает уже привязанные к сертификату активные макеты
export async function fetchTemplates(certificateId) {
    const response = await fetch(
        `/certificates/${certificateId}/templates`
    );
    if (!response.ok) {
        throw new Error(
            `Ошибка загрузки макетов: ${response.status}`
        );
    }
    return await response.json();
}

//Получает содержимое переменной с абсолютным путем к макетам
export async function fetchAvailableFiles() {
    const response = await fetch(
        "/certificate-templates/files"
    );
    if (!response.ok) {
        throw new Error(
            `Ошибка загрузки файлов макетов: ${response.status}`
        );
    }
    return await response.json();
}

export async function addTemplate( certificateId, data) {
    const response = await fetch(
        `/certificates/${certificateId}/templates`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        }
    );
    const result = await response.json();
    if (!response.ok) {
        throw new Error(
            result.error ||
            `Ошибка добавления макета: ${response.status}`
        );
    }
    return result;
}

export async function deleteTemplate( templateId) {
    const response = await fetch(
        `/certificate-templates/${templateId}`,
        {
            method: "DELETE",
        }
    );
    const result = await response.json();
    if (!response.ok) {
        throw new Error(
            result.error ||
            `Ошибка удаления макета: ${response.status}`
        );
    }
    return result;
}

export async function fetchActiveTemplateVersions() {
    const response = await fetch( "/cert_templates/active");
    if (!response.ok) {
        throw new Error(
            `Ошибка загрузки активных версий макетов: ${response.status}`
        );
    }
    return await response.json();
}