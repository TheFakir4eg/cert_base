

import { setupModalReset, showFlash } from "../utils.js";

const els = {
    modal: document.getElementById('createServiceModal'),
    form: document.getElementById('serviceForm'),
    formActionInput: document.getElementById('formAction'),

    srvIdInput: document.getElementById('serviceIdInput'),
    serviceName: document.getElementById('serviceName'),
    serviceCode: document.getElementById('serviceCode'),
    groupIdSelect: document.getElementById('servicegroup_id'),
    serviceMisId: document.getElementById('serviceMisId'),
    serviceNote: document.getElementById('serviceNote'),
    activeCheckbox: document.getElementById('active'),

    modalTitle: document.getElementById('createServiceModalLabel'),
    submitBtn: document.getElementById('serviceSubmitBtn'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    openCreateModalBtn: document.getElementById('openCreateModalBtn')
}

function addServiceToList(service) {
    const list = document.getElementById("servicesList");

    const li = document.createElement("li");

    li.className =
        "list-group-item d-flex justify-content-between align-items-center";

    li.innerHTML = `
        ${service.name} (Группа: ${service.group_name}) 

        <div>
            <button type="button"
                    class=" btn btn-info mb-3 edit-service-btn"
                    title="Редактировать {{ service.name }}"
                    data-service-id="${service.id}"
                    data-name="${service.name}"
                    data-servicegroup-id="${service.servicegroup_id}"
                    data-code="${service.code}"
                    data-note="${service.note ?? ""}"
                    data-mis-id="${service.mis_id ?? ""}"
                    data-active="${service.is_active}">
                    <i class="bi bi-pencil"></i>
            </button>
        </div>
    `;
    li.id = service.id;
    // пользователь в конце списка
    //list.append(li);

    // пользователь в начале списка ( при обновлении страницы упадет вниз, фильтруясь по id)
    list.prepend(li);
}

function updateServiceInList(service) {
    const btn = document.querySelector(
        `[data-service-id="${service.id}"]`
    );

    if (!btn) {
        return;
    }

    const li = btn.closest("li");

    li.innerHTML = `
        ${service.name} (Группа: ${service.group_name}) 

        <div>
            <button type="button"
                    class=" btn btn-info mb-3 edit-service-btn"
                    data-service-id="${service.id}"
                    data-name="${service.name}"
                    data-servicegroup-id="${service.servicegroup_id}"
                    data-code="${service.code}"
                    data-note="${service.note}"
                    data-mis-id="${service.mis_id}"
                    data-active="${service.is_active}">
                    <i class="bi bi-pencil"></i>
            </button>
        </div>
    `;
}

function openEditModal(btn) {
    console.log(btn.dataset);
    els.formActionInput.value = "edit";

    els.srvIdInput.value = btn.dataset.serviceId;
    //console.log("srvIdInput =", els.srvIdInput.value);

    els.serviceName.value = btn.dataset.name;
    console.log("els.serviceCode.value =", els.serviceCode.value);
    els.serviceCode.value = btn.dataset.code;
    els.groupIdSelect.value = btn.dataset.servicegroupId;
    els.serviceMisId.value = btn.dataset.misId;
    els.serviceNote.value = btn.dataset.note;
    els.activeCheckbox.checked = btn.dataset.active === "true";

    //console.log("els.modalTitle.textContent =", els.modalTitle.textContent);
    els.modalTitle.textContent = "Редактирование услуги";
    //console.log("els.submitBtn.textContent =", els.submitBtn.textContent);
    els.submitBtn.textContent = "Сохранить";

    bootstrap.Modal
        .getOrCreateInstance(els.modal)
        .show();
}

document.addEventListener("DOMContentLoaded", function () {

    if (els.openCreateModalBtn) {
        els.openCreateModalBtn.addEventListener("click", () => {
            let modal = bootstrap.Modal.getInstance("#createServiceModal");
            if (!modal) {
                const modalElement = document.getElementById("createServiceModal");
                if (!modalElement) {
                    console.error("Элемент #createServiceModal не найден");
                    return;
                }
                modal = new bootstrap.Modal(modalElement);
            }
            
            modal.show();
        });
    }

    // обработка редактирования пользователя
    document.getElementById("servicesList").addEventListener("click", (e) => {
        const btn = e.target.closest(".edit-service-btn");

        if (!btn) {
            return;
        }

        openEditModal(btn);
    });

    // обработка создания пользователя (нажатие кнопки "Создать" внутри модалки)
    els.form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const payload = {
            service_id: els.srvIdInput.value ? els.srvIdInput.value: null,
            name: els.serviceName.value,
            code: els.serviceCode.value,
            servicegroup_id: els.groupIdSelect.value,
            mis_id: els.serviceMisId.value ? els.serviceMisId.value : null,
            note: els.serviceNote.value ? els.serviceNote.value : null,
            is_active: els.activeCheckbox.checked
        };
        console.log(payload);
        const url = els.formActionInput.value === "create"
            ? "/services/create"
            : "/services/edit";

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
                        () => addServiceToList(data.service),
                        { once: true }
                    );

                } else {

                    els.modal.addEventListener(
                        "hidden.bs.modal",
                        () => updateServiceInList(data.service),
                        { once: true }
                    );

                }
        }
        
    });

});