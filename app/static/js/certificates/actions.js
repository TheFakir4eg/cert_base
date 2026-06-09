// /app/static/js/certificates/actions.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import { money, showFlash } from "../utils.js";
 
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

        dom.issueModal.show();
    });
}

// выдача сертификата. Обработка нажатия "Выдать" в модалке
document.getElementById("issueCertForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        cert_id: document.getElementById("issue_cert_id").value,
        issue_date: document.getElementById("issue_date").value,
        client_id: document.getElementById("issue_client").value,
        place_id: document.getElementById("issue_place").value,
        note: document.getElementById("issue_note").value
    };

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

            const result = await response.json();

            if (!response.ok) {
                errorBlock.textContent =
                    result.message || "Ошибка создания сертификата";

                errorBlock.classList.remove("d-none");
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