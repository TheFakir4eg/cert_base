// /app/static/js/placeInteraction.js

import { setupModalReset, showFlash } from "./utils.js";

const els = {
    modal: document.getElementById('createPlaceModal'),
    form: document.getElementById('placeForm'),
    formActionInput: document.getElementById('formAction'),
    placeIdInput: document.getElementById('placeIdInput'),
    //loginInput: document.getElementById('login'),
    addressInput: document.getElementById('address'),
    nameInput: document.getElementById('name'),
    noteInput: document.getElementById('note'),
    modalTitle: document.getElementById('createPlaceModalLabel'),
    submitBtn: document.getElementById('submitBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    //cancelEditBtn: document.getElementById('cancelEditBtn'),
    openCreateModalBtn: document.getElementById('openCreateModalBtn')
}

function addPlaceToList(place) {
    const list = document.getElementById("placesList");

    const li = document.createElement("li");

    li.className =
        "list-group-item d-flex justify-content-between align-items-center";

    li.innerHTML = renderPlace(place);
    li.id = place.id;
    // пользователь в конце списка
    //list.append(li);

    // пользователь в начале списка ( при обновлении страницы упадет вниз, фильтруясь по id)
    list.prepend(li);
}

function updatePlaceInList(place) {
    const btn = document.querySelector(
        `[data-place-id="${place.id}"]`
    );

    if (!btn) {
        return;
    }

    const li = btn.closest("li");

    li.innerHTML = renderPlace(place);
}

function renderPlace(place) {
    return `
        ${place.name} - ${place.address ?? ""} - ${place.note ?? ""}
            <div>
                <button
                    type="button"
                    class="btn btn-info edit-place-btn"
                    title="Редактировать ${place.name}"
                    data-place-id="${place.id}"
                    data-name="${place.name}"
                    data-address="${place.address ?? ""}"
                    data-note="${place.note ?? ""}">
                    <i class="bi bi-pencil"></i>
                </button>         
                <form
                    method="POST"
                    style="display:inline;"
                    id="delete-form-${place.id}">

                    <input
                        type="hidden"
                        name="action"
                        value="delete">

                    <input
                        type="hidden"
                        name="place_id"
                        value="${place.id}">

                    <button
                        type="button"
                        class="btn btn-info btn-sm"
                        title="Удалить ${place.name}"
                        data-confirm="true"
                        data-confirm-title="Удаление места"
                        data-confirm-text="Вы уверены, что хотите удалить место «${place.name}»?"
                        data-confirm-form-id="delete-form-${place.id}">
                        ❌
                    </button>
                </form>
            </div>
    `;
}

function openEditModal(btn) {

    els.formActionInput.value = "edit";

    els.placeIdInput.value = btn.dataset.placeId;
    console.log("placeIdInput =", els.placeIdInput.value);
    els.nameInput.value = btn.dataset.name;
    els.addressInput.value = btn.dataset.address;
    els.noteInput.value = btn.dataset.note;

    els.modalTitle.textContent = "Редактирование места";
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
    
    // обработка редактирования места
    document.getElementById("placesList").addEventListener("click", (e) => {
        const btn = e.target.closest(".edit-place-btn");

        if (!btn) {
            return;
        }

        openEditModal(btn);
    });

    // обработка создания места (нажатие кнопки "Создать" внутри модалки)
    els.form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            place_id: els.placeIdInput.value,
            name: els.nameInput.value,
            address: els.addressInput.value,
            note: els.noteInput.value,
        };
        console.log(payload);
        const url = els.formActionInput.value === "create"
            ? "/places/create"
            : "/places/edit";

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
                        () => addPlaceToList(data.place),
                        { once: true }
                    );

                } else {

                    els.modal.addEventListener(
                        "hidden.bs.modal",
                        () => updatePlaceInList(data.place),
                        { once: true }
                    );

                }
        }
        
    });
});