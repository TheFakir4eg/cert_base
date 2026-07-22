// static/js/services/selector/actions.js

export async function loadServices(serviceGroupId = null) {
    let url = "/api/services";

    if (serviceGroupId) {
        url += `?group=${serviceGroupId}`;
    }
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Не удалось загрузить услуги");
    }
    return await response.json();
}

export async function loadGroups() {
    const response = await fetch("/api/servicegroups");

    if (!response.ok) {
        throw new Error("Не удалось загрузить группы услуг");
    }
    return await response.json();
}