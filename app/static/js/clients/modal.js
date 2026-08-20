// /app/static/js/clients/modal.js

//console.log("CLIENT MODAL.JS LOADED");
const els = {
    fullNameBlock: document.getElementById("clientFullNameBlock"),
    fullNameLabel: document.getElementById("clientFullNameLabel"),
    modalTitle: document.getElementById("createClientModalLabel"),
    actionInput: document.getElementById("clientAction"),
    clientIdInput: document.getElementById("clientId"),
    //nameInput: document.getElementById("clientName"),
    lastNameInput: document.getElementById("clientLastName"),
    firstNameInput: document.getElementById("clientFirstName"),
    secondNameInput: document.getElementById("clientSecondName"),

    phoneInput: document.getElementById("clientPhone"),
    emailInput: document.getElementById("clientEmail"),
    externalIdInput: document.getElementById("clientExternalId"),
    noteInput: document.getElementById("clientNote"),

    submitBtn: document.getElementById("clientSubmitBtn"),
    submitMode: document.getElementById("clientSubmitMode"),
    modal: document.getElementById("createClientModal"),
};

let currentCreateSource = null;

setupPhoneMask(els.phoneInput);

export function openCreateClientModal(prefillName = "", source = null) {
    console.log("openCreateClientModal");
    // console.log(
    //     "open client modal",
    //     document.querySelectorAll(".modal.show"),
    //     document.querySelectorAll(".modal-backdrop")
    // );
    //let currentCreateSource = null;
    currentCreateSource = source;
    
    els.submitMode.value = "post";
    let prefillLastName = "";
    let prefillFirstName = "";
    let prefillSecondName = "";

    if (prefillName) {
        const parts = prefillName.trim().split(/\s+/);

        prefillLastName = normalizeNamePart(parts[0]);
        prefillFirstName = normalizeNamePart(parts[1]);
        prefillSecondName = normalizeNamePart(parts[2]);

        els.submitMode.value = "api";
    }

    // Если модалка открыта из другого компонента
    // через eventBus — создаём клиента через API.
    if (source) {
        els.submitMode.value = "api";
    }

    els.modalTitle.textContent = "Создать клиента";

    els.actionInput.value = "create";
    
    els.clientIdInput.value = "";

    //els.nameInput.value = prefillName;
    els.lastNameInput.value = prefillLastName;
    els.firstNameInput.value = prefillFirstName;
    els.secondNameInput.value = prefillSecondName;
    els.phoneInput.value = "";
    els.noteInput.value = "";
    els.fullNameBlock.classList.add("d-none");

    els.submitBtn.textContent = "Создать";

    bootstrap.Modal.getOrCreateInstance(els.modal).show();
}

export function openEditClientModal(client) {
    //console.log(client);
    els.modalTitle.textContent = "Редактирование клиента";
    els.submitMode.value = "post";
    els.actionInput.value = "edit";
    els.clientIdInput.value = client.id;

    //els.nameInput.value = client.name;
    els.lastNameInput.value = client.lastName;
    els.firstNameInput.value = client.firstName;
    els.secondNameInput.value = client.secondName;

    els.phoneInput.value = client.phone || "";
    els.emailInput.value = client.email || "";
    els.externalIdInput.value = client.externalId || "";
    els.noteInput.value = client.note || "";
    
    els.fullNameLabel.textContent = client.full_name;
    els.fullNameBlock.classList.remove("d-none");
    
    els.submitBtn.textContent = "Сохранить";

    bootstrap.Modal.getOrCreateInstance(els.modal).show();
}

export function getClientFormData() {
    return {
        lastName: els.lastNameInput.value,
        firstName: els.firstNameInput.value,
        secondName: els.secondNameInput.value,
        phone: els.phoneInput.value,
        email: els.emailInput.value,
        externalId: els.externalIdInput.value,
        note: els.noteInput.value
    };
}

export function getClientFormAction() {
    return els.actionInput.value;
}

export function getClientFormMeta() {
    return {
        modal: els.modal,
        submitBtn: els.submitBtn,
        source: currentCreateSource
    };
}

export function clearForm() {
    els.clientIdInput.value = "";

    els.lastNameInput.value = "";
    els.firstNameInput.value = "";
    els.secondNameInput.value = "";

    els.phoneInput.value = "";
    els.emailInput.value = "";
    els.externalIdInput.value = "";
    els.noteInput.value = "";

    els.fullNameLabel.textContent = "";
}

// функция для автозамены первой введенной буквы на заглавную.
// также позволяет не вводить данные "имя" и "отчество"
function normalizeNamePart(value) {
    if (!value) return "";

    return value.charAt(0).toUpperCase() +
           value.slice(1).toLowerCase();
}

function setupPhoneMask(input) {
    if (!input) return;

    input.addEventListener("input", () => {
        let digits = input.value.replace(/\D/g, "");

        // убираем первую 7 или 8
        if (digits.startsWith("8")) {
            digits = digits.slice(1);
        }

        if (digits.startsWith("7")) {
            digits = digits.slice(1);
        }

        // максимум 10 цифр после +7
        digits = digits.slice(0, 10);

        let result = "+7";

        if (digits.length > 0) {
            result += " (" + digits.slice(0, 3);
        }

        if (digits.length >= 4) {
            result += ") " + digits.slice(3, 6);
        }

        if (digits.length >= 7) {
            result += "-" + digits.slice(6, 8);
        }

        if (digits.length >= 9) {
            result += "-" + digits.slice(8, 10);
        }

        input.value = result;
    });
}