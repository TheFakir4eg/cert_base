// /app/static/js/userInteraction.js

import { setupModalReset, showFlash } from "./utils.js";

const els = {
    modal: document.getElementById('createUserModal'),
    form: document.getElementById('userForm'),
    formActionInput: document.getElementById('formAction'),
    userIdInput: document.getElementById('userIdInput'),
    loginInput: document.getElementById('login'),
    nameInput: document.getElementById('name'),
    passwordInput: document.getElementById('password'),
    groupIdSelect: document.getElementById('group_id'),
    placeIdSelect: document.getElementById('working_place'),
    activeCheckbox: document.getElementById('active'),
    modalTitle: document.getElementById('createUserModalLabel'),
    submitBtn: document.getElementById('submitBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    openCreateModalBtn: document.getElementById('openCreateModalBtn')
}

function addUserToList(user) {
    const list = document.getElementById("usersList");

    const li = document.createElement("li");

    li.className =
        "list-group-item d-flex justify-content-between align-items-center";

    li.innerHTML = `
        ${user.name} (Группа: ${user.group}) - Активен: ${user.active ? "Да" : "Нет"}

        <div>
            <button
                type="button"
                class="btn btn-warning btn-sm me-1 edit-user-btn"
                data-user-id="${user.id}"
                data-login="${user.login}"
                data-name="${user.name}"
                data-group-id="${user.group_id}"
                data-place-id="${user.place_id}"
                data-active="${user.active}">
                <i class="bi bi-pencil"></i>
            </button>
        </div>
    `;
    li.id = user.id;
    // пользователь в конце списка
    //list.append(li);

    // пользователь в начале списка ( при обновлении страницы упадет вниз, фильтруясь по id)
    list.prepend(li);
}

function updateUserInList(user) {
    const btn = document.querySelector(
        `[data-user-id="${user.id}"]`
    );

    if (!btn) {
        return;
    }

    const li = btn.closest("li");

    li.innerHTML = `
        ${user.name} (Группа: ${user.group}) - Активен: ${user.active ? "Да" : "Нет"}

        <div>
            <button
                type="button"
                class="btn btn-warning btn-sm me-1 edit-user-btn"
                data-user-id="${user.id}"
                data-login="${user.login}"
                data-name="${user.name}"
                data-group-id="${user.group_id}"
                data-place-id="${user.place_id}"
                data-active="${user.active}">
                <i class="bi bi-pencil"></i>
            </button>
        </div>
    `;
}

function openEditModal(btn) {

    els.formActionInput.value = "edit";

    els.userIdInput.value = btn.dataset.userId;
    console.log("userIdInput =", els.userIdInput.value);
    els.loginInput.value = btn.dataset.login;
    els.nameInput.value = btn.dataset.name;
    els.groupIdSelect.value = btn.dataset.groupId;
    els.placeIdSelect.value = btn.dataset.placeId || "";
    els.activeCheckbox.checked = btn.dataset.active === "true";

    els.passwordInput.value = "";
    els.passwordInput.removeAttribute("required");

    els.modalTitle.textContent = "Редактирование пользователя";
    els.submitBtn.textContent = "Сохранить";

    bootstrap.Modal
        .getOrCreateInstance(els.modal)
        .show();
}

document.addEventListener('DOMContentLoaded', function() {

    if (els.modal) {
        els.modal.addEventListener("hide.bs.modal", () => {

            const focused = document.activeElement;

            if (focused instanceof HTMLElement) {
                focused.blur();
            }
        });
        els.modal.addEventListener("hidden.bs.modal", () => {

            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        });
    }

    // if (els.openCreateModalBtn) {
    //     els.openCreateModalBtn.addEventListener("click", () => {
    //         bootstrap.Modal.getOrCreateInstance(els.modal).show();
    //     });
        
    // }

    // if (els.form) {
    //     if (els.cancelEditBtn) {
    //         els.cancelEditBtn.addEventListener("click", () => {
    //             console.log("CANSEL");
    //             els.form.reset();
    //             // Bootstrap 5.3 + Chrome fix
    //             els.modal.addEventListener("hide.bs.modal", () => {
    //                 if (els.modal.contains(document.activeElement)) {
    //                     document.activeElement.blur();
    //                 }
    //             });
    //             //setupModalReset("userForm", "createUserModal", "userError");
    //         });
    //     }
    // }
    
    // обработка редактирования пользователя
    document.getElementById("usersList").addEventListener("click", (e) => {
        const btn = e.target.closest(".edit-user-btn");

        if (!btn) {
            return;
        }

        openEditModal(btn);
    });

    // обработка создания пользователя (нажатие кнопки "Создать" внутри модалки)
    els.form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            user_id: els.userIdInput.value,
            login: els.loginInput.value,
            name: els.nameInput.value,
            password: els.passwordInput.value,
            group_id: els.groupIdSelect.value,
            place_id: els.placeIdSelect.value,
            active: els.activeCheckbox.checked
        };
        console.log(payload);
        const url = els.formActionInput.value === "create"
            ? "/users/create"
            : "/users/edit";

        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        let data;

        try {
            data = await res.json();
        } catch {
            showFlash("Сервер вернул некорректный ответ");
            return;
        }

        if (!res.ok) {
            showFlash(data.error || "Ошибка");
            return;
        }
        // успех
        if (data.success) {
            showFlash(data.message);
            const modal = bootstrap.Modal.getInstance(els.modal);
            modal.hide();
                if (els.formActionInput.value === "create") {
                    els.modal.addEventListener(
                        "hidden.bs.modal",
                        () => addUserToList(data.user),
                        { once: true }
                    );
                } else {
                    els.modal.addEventListener(
                        "hidden.bs.modal",
                        () => updateUserInList(data.user),
                        { once: true }
                    );
                }
        }
    });
});