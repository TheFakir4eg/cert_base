// /app/static/js/certificates/actions.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import { money, showFlash } from "../utils.js";
//import { prepareCreateClientForm } from "../clients/modal.js";
import { eventBus } from "../core/eventBus.js";
import { openCreateClientModal } from "../clients/modal.js";

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

        if (!state.selectedRow) return;

        const modalElement = document.getElementById("editCertModal");
        const modal = new bootstrap.Modal(modalElement);

        // ищем поля ТОЛЬКО внутри edit modal
        const form = modalElement.querySelector("form");

        form.querySelector("[name=cert_id]").value = state.selectedRow.dataset.id;
        form.querySelector("[name=reason]").value = state.selectedRow.dataset.reason;
        form.querySelector("[name=series]").value = state.selectedRow.dataset.series;
        form.querySelector("[name=number]").value = state.selectedRow.dataset.number;
        form.querySelector("[name=total_amount]").value = state.selectedRow.dataset.totalAmount;
        form.querySelector("[name=servicegroup_id]").value = state.selectedRow.dataset.servicegroupId;
        form.querySelector("[name=note]").value = state.selectedRow.dataset.note;

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
        
        // обработка добавления клиента
        // issueCreateClientBtn.addEventListener("click", () => {
        //     prepareCreateClientForm(issueClientSelect.control_input.value);

        //     bootstrap.Modal
        //         .getOrCreateInstance(
        //             document.getElementById("createClientModal")
        //         )
        //         .show();
        // });
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

const createForm = document.getElementById("createCertForm");

if (createForm) {
    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBlock =
            document.getElementById("createCertError");

        errorBlock.classList.add("d-none");
        errorBlock.textContent = "";

        const formData = new FormData(createForm);

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