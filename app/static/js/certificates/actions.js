// /app/static/js/certificates/actions.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import { money, showFlash, setupModalReset, setupBulkFields } from "../utils.js";
//import { prepareCreateClientForm } from "../clients/modal.js";
import { eventBus } from "../core/eventBus.js";
import { openCreateClientModal } from "../clients/modal.js";
import { initExpirationType } from "./form.js";

const issueClientSelect = new TomSelect("#issue_client", {
    create: false,
    placeholder: "Начните вводить клиента..."
});

let currentClientSearch = "";

issueClientSelect.on("type", (str) => {
    //currentClientSearch = str;
    currentClientSearch = (str || "").trim();
    console.log("typed:", str);
});

// слушаем событие для передачи данных в модалку выдачи сертификата
// document.addEventListener("clientCreated", (event) => {
//         const client = event.detail;

//         issueClientSelect.addOption({
//             value: client.id,
//             text: client.name
//         });

//         issueClientSelect.setValue(client.id);
//     }
// );
eventBus.on("client:created", (client) => {
    issueClientSelect.addOption({
        value: client.id,
        text: client.name
    });

    issueClientSelect.refreshOptions(false);
    issueClientSelect.setValue(client.id);
});

eventBus.on("client:open-create", ({ name }) => {
    openCreateClientModal(name);
});

// вызов модалки создания клиента внутри модалки выдачи сертификата
const issueCreateClientBtn = document.getElementById("issueCreateClientBtn");

if (issueCreateClientBtn) {
    issueCreateClientBtn.addEventListener("click", () => {
        eventBus.emit("client:open-create", {
            name: currentClientSearch
        });
    });
}

// функция показа истории транзакций
export async function openUsageHistory(certId) {
    const response = await fetch(`/certificates/${certId}/usages`);
    const data = await response.json();
    const table = document.getElementById("usageHistoryTable");
    const emptyText = document.getElementById("noUsagesText");

    table.innerHTML = "";

    if (data.length === 0) {emptyText.classList.remove("d-none");} 
    else {
        emptyText.classList.add("d-none");
        data.forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u.date}</td>
                <td>${money(u.amount)}</td>
                <td>${u.user}</td>
                <td>${u.comment}</td>
            `;
            table.appendChild(tr);
        });
    }

    new bootstrap.Modal(document.getElementById("usageHistoryModal")).show();
}

// работа кнопки "Изменить"
if (dom.editingBtn) {
    dom.editingBtn.addEventListener("click", () => {
        const modalElement = document.getElementById("editCertModal");
        const modal = new bootstrap.Modal(modalElement);
        const form = modalElement.querySelector("form");

        const updateExpirationUI = initExpirationType(form);
        if (!state.selectedRow) return;

        //console.log(state.selectedRow.dataset);

        const expirationType = form.querySelector("[name=expiration_type]");
        const expirationDate = form.querySelector("[name=expiration_date]");
        
        form.querySelector("[name=cert_id]").value = state.selectedRow.dataset.id;
        form.querySelector("[name=reason]").value = state.selectedRow.dataset.reason;
        form.querySelector("[name=series]").value = state.selectedRow.dataset.series;
        form.querySelector("[name=number]").value = state.selectedRow.dataset.number;

        form.querySelector("[name=place_id]").value = state.selectedRow.dataset.placeId;
        form.querySelector("[name=issue_place_id]").value = state.selectedRow.dataset.issuePlaceId;

        form.querySelector("[name=mol_id]").value = state.selectedRow.dataset.molId;
        

        form.querySelector("[name=is_single_use]").checked = state.selectedRow.dataset.isSingleUse === "True";
        form.querySelector("[name=require_original]").checked = state.selectedRow.dataset.requireOriginal === "True";
        form.querySelector("[name=require_stamp]").checked = state.selectedRow.dataset.requireStamp === "True";
        form.querySelector("[name=max_50_percent]").checked = state.selectedRow.dataset.maxPercent === "True";

        form.querySelector("[name=total_amount]").value = state.selectedRow.dataset.totalAmount;
        form.querySelector("[name=servicegroup_id]").value = state.selectedRow.dataset.servicegroupId;
        form.querySelector("[name=note]").value = state.selectedRow.dataset.note;

        if (state.selectedRow.dataset.expirationDate) {
            expirationType.value = "date";
            expirationDate.value =
                state.selectedRow.dataset.expirationDate;
        } else {
            expirationType.value = "unlimited";
        }

        updateExpirationUI();

        //console.log(expirationType.value);
        //console.log(expirationDate.value);
        console.log(form.querySelector("#expirationDateBlock"));

        modal.show();
        
    });
}

// работа кнопки "Выдача"
if (dom.issuingBtn) {
    dom.issuingBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;

        document.getElementById("issue_cert_id").value = state.selectedRow.dataset.id;

        // дата выдачи - сегодня
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("issue_date").value = today;

        // очищаем клиента перед показом окна
        issueClientSelect.clear();
        document.getElementById("issue_note").value = "";

        dom.issueModal.show();
        

    });
}

// выдача сертификата. Обработка нажатия "Выдать" в модалке
document.getElementById("issueCertForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        cert_id: document.getElementById("issue_cert_id").value,
        issue_date: document.getElementById("issue_date").value,
        //client_id: document.getElementById("issue_client").value,
        client_id: issueClientSelect.getValue(),
        place_id: document.getElementById("issue_place").value,
        note: document.getElementById("issue_note").value
    };

    if (!issueClientSelect.getValue()) {
        alert("Выберите клиента");
        return;
    }

    const response = await fetch("/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (response.ok) location.reload();
});

// работа кнопки "Списание"
if (dom.spendBtn) {
    dom.spendBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;
        document.getElementById("spend_cert_id").value = state.selectedRow.dataset.id;
        document.getElementById("spend_balance").value = state.selectedRow.dataset.balance;
        document.getElementById("spend_amount").value = "";
        document.getElementById("spend_comment").value = "";
        dom.spendModal.show();
    });
}

// работа кнопки "Вывод"
if (dom.closingBtn) {
    dom.closingBtn.addEventListener("click", async () => {
        if (!state.selectedRow) return;
        const certId = state.selectedRow.dataset.id;
        const response = await fetch(`/certificates/${certId}/close`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();
        if (response.ok) {
            showFlash("Сертификат успешно выведен", "success");
            setTimeout(() => location.reload(), 1500);
        } else {
            alert(result.error || "Ошибка");
        }
    });
}

// работа кнопки "Восстановить"
if (dom.restoreBtn) {
    dom.restoreBtn.addEventListener("click", async () => {
        if (!state.selectedRow) return;

        const certId = state.selectedRow.dataset.id;

        const response = await fetch(`/certificates/${certId}/restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();

        if (response.ok) {
            showFlash("Сертификат восстановлен", "success");
            setTimeout(() => location.reload(), 1500);
        } else {
            alert(result.error || "Ошибка");
        }
    });
}

// создание сертификата
const createForm = document.getElementById("createCertForm");

if (createForm) {
    setupModalReset(
        "createCertModal",
        "createCertForm",
        "createCertError"
    );
    setupBulkFields();
    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBlock =
            document.getElementById("createCertError");

        errorBlock.classList.add("d-none");
        errorBlock.textContent = "";

        const formData = new FormData(createForm);
        const series = createForm.elements["series"].value.trim();
        const amount = createForm.elements["total_amount"].value.trim();

        const numbers = series.match(/\d+/g);
        const seriesAmount = numbers?.at(-1);

        // ---- отладочный блок
        for (const [key, value] of formData.entries()) {
            console.log(key, value);
        }
        // ---------
        if (!Number.isFinite(Number(amount))) {
            errorBlock.textContent =
                "Номинал должен содержать только цифры";

            errorBlock.classList.remove("d-none");
            return;
        }
        if (seriesAmount && Number(seriesAmount) !== Number(amount)) {
            errorBlock.textContent =
                `Номинал в серии (${seriesAmount}) не соответствует полю "Номинал" (${amount})`;

            errorBlock.classList.remove("d-none");
            return;
        }

        try {
            const response = await fetch("/certificates", {
                method: "POST",
                body: formData
            });

            //const result = await response.json();
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                errorBlock.textContent =
                    result.message || "Ошибка создания сертификата";

                errorBlock.classList.remove("d-none");
                console.error("SERVER ERROR:", result);
                return;
            }
            sessionStorage.setItem(
                "flashSuccess",
                result.message
            );

            location.reload();
            // setTimeout(() => {
            //     location.reload();
            // }, 1000);

            

        } catch (error) {
            errorBlock.textContent =
                "Ошибка соединения с сервером";

            errorBlock.classList.remove("d-none");
        }
    });
    
}

const editForm = document.getElementById("editCertForm");

if (editForm) {
    setupModalReset(
        "editCertModal",
        "editCertForm",
        "editCertError"
    );

    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBlock =
            document.getElementById("editCertError");

        errorBlock.classList.add("d-none");
        errorBlock.textContent = "";

        const formData = new FormData(editForm);

        const series = editForm.elements["series"].value.trim();

        const amount = editForm.elements["total_amount"].value.trim();

        const numbers = series.match(/\d+/g);
        const seriesAmount = numbers?.at(-1);

        if (!Number.isFinite(Number(amount))) {
            errorBlock.textContent =
                "Номинал должен содержать только цифры";

            errorBlock.classList.remove("d-none");
            return;
        }
        if (
            seriesAmount &&
            Number(seriesAmount) !== Number(amount)
        ) {
            errorBlock.textContent =
                `Номинал в серии (${seriesAmount}) не соответствует полю "Номинал" (${amount})`;

            errorBlock.classList.remove("d-none");
            return;
        }

        try {
            const response = await fetch(
                "/certificates",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                errorBlock.textContent =
                    result.message ||
                    "Ошибка изменения сертификата";

                errorBlock.classList.remove("d-none");
                return;
            }

            sessionStorage.setItem(
                "flashSuccess",
                result.message
            );

            location.reload();

        } catch (error) {
            errorBlock.textContent =
                "Ошибка соединения с сервером";

            errorBlock.classList.remove("d-none");
        }
    });
}