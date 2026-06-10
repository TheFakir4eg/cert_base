// /app/static/js/clients/modal.js

console.log("CLIENT MODAL.JS LOADED");
const els = {
    modalTitle: document.getElementById("createClientModalLabel"),
    actionInput: document.getElementById("clientAction"),
    clientIdInput: document.getElementById("clientId"),
    nameInput: document.getElementById("clientName"),
    phoneInput: document.getElementById("clientPhone"),
    noteInput: document.getElementById("clientNote"),
    submitBtn: document.getElementById("clientSubmitBtn"),
    modal: document.getElementById("createClientModal"),
};

export function openCreateClientModal(prefillName = "") {
    console.log("openCreateClientModal");
    els.modalTitle.textContent = "Создать клиента";

    els.actionInput.value = "create";
    els.clientIdInput.value = "";

    els.nameInput.value = prefillName;
    els.phoneInput.value = "";
    els.noteInput.value = "";

    els.submitBtn.textContent = "Создать";

    bootstrap.Modal.getOrCreateInstance(els.modal).show();
}

export function openEditClientModal(client) {
    els.modalTitle.textContent = "Редактирование клиента";

    els.actionInput.value = "edit";
    els.clientIdInput.value = client.id;

    els.nameInput.value = client.name;
    els.phoneInput.value = client.phone || "";
    els.noteInput.value = client.note || "";

    els.submitBtn.textContent = "Сохранить";

    bootstrap.Modal.getOrCreateInstance(els.modal).show();
}

export function getClientFormData() {
    return {
        name: els.nameInput.value,
        phone: els.phoneInput.value,
        note: els.noteInput.value
    };
}

export function getClientFormAction() {
    return els.actionInput.value;
}

export function getClientFormMeta() {
    return {
        modal: els.modal,
        submitBtn: els.submitBtn
    };
}