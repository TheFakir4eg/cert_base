// /app/static/js/certModalWindow.js
import { state } from "./state.js";
import * as dom from "./dom.js";
import {
    applyFilter,
    getCurrentFilter
} from "./filters.js";


//export {};




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

        // дат выдачи - сегодня
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("issue_date").value = today;

        dom.issueModal.show();
    });
}

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

document.addEventListener("DOMContentLoaded", () => {

    // вкладка по умолчанию
    let activeTab = document.querySelector(".filter-btn.active");

    // если активной нет — берем первую доступную
    if (!activeTab) {
        activeTab = document.querySelector(".filter-btn");
    }

    // применяем фильтр
    if (activeTab) {
        activeTab.classList.add("active");
        applyFilter(activeTab.dataset.filter);
    }

    const spendForm = document.getElementById("spendCertForm");

    if (!spendForm) return;

    spendForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const certId = document.getElementById("spend_cert_id").value;

        const data = {
            amount: document.getElementById("spend_amount").value,
            comment: document.getElementById("spend_comment").value
        };

        const response = await fetch(`/certificates/${certId}/spend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            location.reload();
        } else {
            alert(result.message);
        }
    });
});
