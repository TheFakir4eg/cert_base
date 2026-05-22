// /app/static/js/clients.js

document.addEventListener("DOMContentLoaded", () => {

    const modalTitle = document.getElementById("createClientModalLabel");

    const actionInput = document.getElementById("clientAction");
    const clientIdInput = document.getElementById("clientId");

    const nameInput = document.getElementById("clientName");
    const phoneInput = document.getElementById("clientPhone");
    const noteInput = document.getElementById("clientNote");

    const submitBtn = document.getElementById("clientSubmitBtn");

    const createBtn = document.getElementById("createClientBtn");

    createBtn.addEventListener("click", () => {

        modalTitle.textContent = "Создать клиента";

        actionInput.value = "create";
        clientIdInput.value = "";

        nameInput.value = "";
        phoneInput.value = "";
        noteInput.value = "";

        submitBtn.textContent = "Создать";
    });

    document.querySelectorAll(".edit-client-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            modalTitle.textContent = "Редактирование клиента";

            actionInput.value = "edit";

            clientIdInput.value = btn.dataset.clientId;

            nameInput.value = btn.dataset.clientName;
            phoneInput.value = btn.dataset.clientPhone;
            noteInput.value = btn.dataset.clientNote;

            submitBtn.textContent = "Сохранить";
        });

    });

});
