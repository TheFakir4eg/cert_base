// /app/static/js/certModalWindow.js

const issuingBtn = document.getElementById("issuingCertBtn");
const editingBtn = document.getElementById("editCertBtn");
const spendBtn = document.getElementById("spendCertBtn");
const closingBtn = document.getElementById("closingCertBtn");
const restoreBtn = document.getElementById("restoreCertBtn");

const spendModal = new bootstrap.Modal(document.getElementById("spendCertModal"));

let selectedRow = null;
let selectedCertId = null;

const tbody = document.getElementById("certTableBody");

tbody.addEventListener("click", (e) => {

    const row = e.target.closest(".cert-row");
    if (!row) return;

    selectRow(row);
});

tbody.addEventListener("dblclick", async (e) => {

    const row = e.target.closest(".cert-row");
    if (!row) return;

    const certId = row.dataset.id;
    await openUsageHistory(certId);
});

function selectRow(row) {

    document.querySelectorAll(".cert-row")
        .forEach(r => r.classList.remove("table-primary"));

    row.classList.add("table-primary");

    selectedRow = row;
    selectedCertId = row.dataset.id;

    const active = row.dataset.active === "true";
    const balance = parseFloat(row.dataset.balance);
    const hasClient = row.dataset.clientId && row.dataset.clientId !== "";

    editingBtn.disabled = false;
    issuingBtn.disabled = hasClient || !active;
    spendBtn.disabled = !hasClient || !active || balance <= 0;
    closingBtn.disabled = !active || balance > 0;
    restoreBtn.disabled = active;
}

async function openUsageHistory(certId) {

    const response = await fetch(`/certificates/${certId}/usages`);
    const data = await response.json();

    const table = document.getElementById("usageHistoryTable");
    const emptyText = document.getElementById("noUsagesText");

    table.innerHTML = "";

    if (data.length === 0) {
        emptyText.classList.remove("d-none");
    } else {
        emptyText.classList.add("d-none");

        data.forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u.date}</td>
                <td>${u.amount}</td>
                <td>${u.user}</td>
                <td>${u.comment}</td>
            `;
            table.appendChild(tr);
        });
    }

    new bootstrap.Modal(
        document.getElementById("usageHistoryModal")
    ).show();
}

document.getElementById("editCertBtn").addEventListener("click", () => {

    if (!selectedRow) return;

    const modalElement = document.getElementById("editCertModal");
    const modal = new bootstrap.Modal(modalElement);

    // ⭐ ищем поля ТОЛЬКО внутри edit modal
    const form = modalElement.querySelector("form");

    form.querySelector("[name=cert_id]").value = selectedRow.dataset.id;
    form.querySelector("[name=reason]").value = selectedRow.dataset.reason;
    form.querySelector("[name=series]").value = selectedRow.dataset.series;
    form.querySelector("[name=number]").value = selectedRow.dataset.number;
    form.querySelector("[name=total_amount]").value = selectedRow.dataset.totalAmount;
    form.querySelector("[name=servicegroup_id]").value = selectedRow.dataset.servicegroupId;
    form.querySelector("[name=note]").value = selectedRow.dataset.note;

    modal.show();
});

// document.querySelectorAll(".filter-btn").forEach(btn => {
//     btn.addEventListener("click", () => {

//         document.querySelectorAll(".filter-btn")
//             .forEach(b => b.classList.remove("active"));

//         btn.classList.add("active");

//         const filter = btn.dataset.filter;

//         document.querySelectorAll(".cert-row").forEach(row => {

//             const status = row.dataset.status;

//             if (filter === "all" || status === filter) {
//                 row.style.display = "";
//             } else {
//                 row.style.display = "none";
//             }
//         });
//     });
// });

// document.querySelectorAll(".filter-btn").forEach(btn => {
//     btn.addEventListener("click", () => {

//         document.querySelectorAll(".filter-btn")
//             .forEach(b => b.classList.remove("active"));

//         btn.classList.add("active");

//         const filter = btn.dataset.filter;

//         document.querySelectorAll(".cert-row").forEach(row => {

//             const status = row.dataset.status;
//             const active = row.dataset.active;

//             // ⭐ вкладка "Выведены"
//             if (filter === "out") {
//                 if (active === "false" || active === "null") {
//                     row.style.display = "";
//                 } else {
//                     row.style.display = "none";
//                 }
//                 return;
//             }

//             // ⭐ остальные вкладки показывают только активные
//             if (active !== "true") {
//                 row.style.display = "none";
//                 return;
//             }

//             // ⭐ обычная фильтрация по статусу
//             if (filter === "all" || status === filter) {
//                 row.style.display = "";
//             } else {
//                 row.style.display = "none";
//             }

//         });
//     });
// });

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        document.querySelectorAll(".filter-btn")
            .forEach(b => b.classList.remove("active"));

        btn.classList.add("active");

        applyFilter(btn.dataset.filter);
    });
});

function applyFilter(filter) {

    document.querySelectorAll(".cert-row").forEach(row => {

        const status = row.dataset.status;
        const active = row.dataset.active;

        // вкладка "Выведены"
        if (filter === "out") {
            if (active === "false" || active === "null") {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
            return;
        }

        // остальные вкладки показывают только активные
        if (active !== "true") {
            row.style.display = "none";
            return;
        }

        // обычная фильтрация по статусу
        if (filter === "all" || status === filter) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

function updateButtonsState() {
    editingBtn.disabled = !selectedRow;
    issuingBtn.disabled = !selectedRow;
}

const issueModal = new bootstrap.Modal(document.getElementById('issueCertModal'));

issuingBtn.addEventListener("click", () => {
    if (!selectedRow) return;

    document.getElementById("issue_cert_id").value = selectedRow.dataset.id;

    // сегодня
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("issue_date").value = today;

    issueModal.show();
});

document.getElementById("issueCertForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        cert_id: document.getElementById("issue_cert_id").value,
        issue_date: document.getElementById("issue_date").value,
        client_id: document.getElementById("issue_client").value,
        note: document.getElementById("issue_note").value
    };

    const response = await fetch("/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (response.ok) location.reload();
});

spendBtn.addEventListener("click", () => {
    if (!selectedRow) return;

    document.getElementById("spend_cert_id").value = selectedRow.dataset.id;
    document.getElementById("spend_balance").value = selectedRow.dataset.balance;

    document.getElementById("spend_amount").value = "";
    document.getElementById("spend_comment").value = "";

    spendModal.show();
});



closingBtn.addEventListener("click", async () => {
    if (!selectedRow) return;

    const certId = selectedRow.dataset.id;

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

restoreBtn.addEventListener("click", async () => {
    if (!selectedRow) return;

    const certId = selectedRow.dataset.id;

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

document.addEventListener("DOMContentLoaded", () => {
    //активируем фильтр при старте страницы
    const activeTab = document.querySelector(".filter-btn.active");
    if (activeTab) {
        applyFilter(activeTab.dataset.filter);
    }

    const spendForm = document.getElementById("spendCertForm");
    if (!spendForm) return;   // защита от падения

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