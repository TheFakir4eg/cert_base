// certificates/services.js
import * as ServiceSelector from "../services/selector/index.js";

let selectedServices = [];
let activeForm = null;
let lockedServiceIds = new Set();

export function setActiveForm(form) {
    activeForm = form;
}

export function setEditMode(services) {
    selectedServices = services;
    lockedServiceIds = new Set(
        services.map(service => service.id)
    );
}

export function setCreateMode() {
    selectedServices = [];
    lockedServiceIds.clear();
}

export function getSelectedServices() {
    return selectedServices;
}

export function setSelectedServices(services) {
    selectedServices = services;
}

export function init(form) {
    activeForm = form;
    if (!form) {
        return;
    }
    const addButton = form.querySelector( "#addCertificateService");
    if (!addButton) {
        return;
    }
    addButton.addEventListener( "click", openSelector);
}

function openSelector() {
    //const form = document.querySelector("#createCertModal form");
    const form = activeForm;
    if (!form) {
        return;
    }
    //const form = servicesContainer.closest("form");
    const serviceGroupSelect = form?.querySelector("[name=servicegroup_id]");
    const serviceGroupId = serviceGroupSelect?.value
        ? Number(serviceGroupSelect.value)
        : null;

    ServiceSelector.open({
        selectedIds: selectedServices.map(
            service => service.id
        ),
        lockedIds: [...lockedServiceIds],
        serviceGroupId: serviceGroupId,
        lockGroup: Boolean(serviceGroupId),
        multiple: true,
        onSave: onServicesSelected
    });
}

function onServicesSelected(services) {
    selectedServices = services;
    renderSelectedServices();
}

export function renderSelectedServices() {
    if (!activeForm) {
        return;
    }
    const container = activeForm.querySelector( "#certificateServices");
    if (!container) {
        console.log("certificateServices is undefined");
        return;
    }
    container.innerHTML = "";
    for (const service of selectedServices) {
        const row = document.createElement("div");
        row.className =
            "list-group-item d-flex " +
            "justify-content-between " +
            "align-items-center";
        row.dataset.serviceId = service.id;
        const name = document.createElement("span");
        name.textContent = service.name;
        row.appendChild(name);

        if (!lockedServiceIds.has(service.id)) {
            const removeButton =
                document.createElement("button");

            removeButton.type = "button";
            removeButton.className = "icon-btn-ghost";
            removeButton.textContent = "×";

            removeButton.addEventListener(
                "click",
                () => removeService(service.id)
            );
            row.appendChild(removeButton);

        }

        container.appendChild(row);
        updateServiceGroupLock();
    }
}

function removeService(serviceId) {
    if (lockedServiceIds.has(serviceId)) {
        return;
    }
    selectedServices = selectedServices.filter(
        service => service.id !== serviceId
    );

    renderSelectedServices();
    updateServiceGroupLock();
}

export function reset() {
    selectedServices = [];
    lockedServiceIds.clear();
    renderSelectedServices();
}

function updateServiceGroupLock() {
    if (!activeForm) {
        return;
    }
    const serviceGroupSelect =  activeForm.querySelector('select[name="servicegroup_id"]');
    if (!serviceGroupSelect) {
        return;
    }

    serviceGroupSelect.disabled = selectedServices.length > 0;
}