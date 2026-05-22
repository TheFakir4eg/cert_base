// /app/static/js/certModalWindow.js
export {};

const issuingBtn = document.getElementById("issuingCertBtn");
const editingBtn = document.getElementById("editCertBtn");
const spendBtn = document.getElementById("spendCertBtn");
const closingBtn = document.getElementById("closingCertBtn");
const restoreBtn = document.getElementById("restoreCertBtn");
const searchToggleBtn = document.getElementById("searchToggleBtn");
const searchBox = document.getElementById("searchBox");
const searchInput = document.getElementById("certSearchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");

const columnFilters = {};
const columnFilterPopup = document.getElementById("columnFilterPopup");
const columnFilterInput = document.getElementById("columnFilterInput");
const applyColumnFilterBtn = document.getElementById("applyColumnFilterBtn");
const clearColumnFilterBtn = document.getElementById("clearColumnFilterBtn");

let currentColumnIndex = null;

const spendModal = new bootstrap.Modal(document.getElementById("spendCertModal"));

let selectedRow = null;
let selectedCertId = null;
let currentSearch = "";

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

//работа кнопки "Поиск" (лупа)
if (searchToggleBtn && searchBox && searchInput) {
    searchToggleBtn.addEventListener("click", () => {
        searchToggleBtn.classList.add("d-none");
        searchBox.classList.remove("d-none");
        requestAnimationFrame(() => {searchBox.classList.add("active");});
        searchInput.focus();
    });
}

if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
        currentSearch = "";
        searchInput.value = "";
        applyFilter(getCurrentFilter());
        searchBox.classList.remove("active");
        setTimeout(() => {
            searchBox.classList.add("d-none");
            searchToggleBtn.classList.remove("d-none");
        }, 250);
    });
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        currentSearch = searchInput.value.trim().toLowerCase();
        applyFilter(getCurrentFilter());
    });
}

function getCurrentFilter() {

    const activeBtn = document.querySelector(".filter-btn.active");

    return activeBtn
        ? activeBtn.dataset.filter
        : "all";
}

function selectRow(row) {

    document.querySelectorAll(".cert-row")
        .forEach(r => r.classList.remove("table-primary"));

    row.classList.add("table-primary");

    selectedRow = row;
    selectedCertId = row.dataset.id;

    const active = row.dataset.active === "true";
    const balance = parseFloat(row.dataset.balance);
    const hasClient = row.dataset.clientId && row.dataset.clientId !== "";

    if (editingBtn) {
        editingBtn.disabled = false;
    }

    if (issuingBtn) {
        issuingBtn.disabled = hasClient || !active;
    }

    if (spendBtn) {
        spendBtn.disabled = !hasClient || !active || balance <= 0;
    }

    if (closingBtn) {
        closingBtn.disabled = !active || balance > 0;
    }

    if (restoreBtn) {
        restoreBtn.disabled = active;
    }
}

// Открытие / закрытие popup по клику на "воронку"
document.querySelectorAll(".column-filter-btn")
    .forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const clickedColumn = btn.dataset.column;
            // popup уже открыт на этой же колонке
            if (
                !columnFilterPopup.classList.contains("d-none") &&
                currentColumnIndex === clickedColumn
            ) {
                columnFilterPopup.classList.add("d-none");
                currentColumnIndex = null;
                return;
            }
            currentColumnIndex = clickedColumn;
            const rect = btn.getBoundingClientRect();
            columnFilterPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
            columnFilterPopup.style.left = `${window.scrollX + rect.left - 180}px`;
            columnFilterPopup.classList.remove("d-none");
            columnFilterInput.value = columnFilters[currentColumnIndex] || "";
            columnFilterInput.focus();
        });
    });

// Применение фильтра
if (applyColumnFilterBtn) {
    if (columnFilterInput) {
        columnFilterInput.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            applyColumnFilterBtn.click();
        });
    }
    applyColumnFilterBtn.addEventListener("click", () => {
        if (currentColumnIndex === null) return;
        columnFilters[currentColumnIndex] =columnFilterInput.value.trim().toLowerCase();
        applyFilter(getCurrentFilter());
        updateColumnFilterButtons();
        columnFilterPopup.classList.add("d-none");
    });
}

// Сброс фильтра
if (clearColumnFilterBtn) {
    clearColumnFilterBtn.addEventListener("click", () => {
        if (currentColumnIndex === null) return;
        delete columnFilters[currentColumnIndex];
        applyFilter(getCurrentFilter());
        updateColumnFilterButtons();
        columnFilterPopup.classList.add("d-none");
    });
}

function updateColumnFilterButtons() {

    document.querySelectorAll(".column-filter-btn")
        .forEach(btn => {

            const columnIndex = btn.dataset.column;

            if (columnFilters[columnIndex]) {
                btn.classList.add("active-filter");
            } else {
                btn.classList.remove("active-filter");
            }
        });
}

// Закрытие popup и основного поиска при клике мимо ( на любом свободном месте)
document.addEventListener("click", (e) => {
    // Закрытие popup
    if (!columnFilterPopup) return;
    if (
        !columnFilterPopup.contains(e.target)
    ) {
        columnFilterPopup.classList.add("d-none");
    }

    // закрытие searchBox
    if (
        searchBox &&
        !searchBox.classList.contains("d-none") &&
        !searchBox.contains(e.target) &&
        e.target !== searchToggleBtn
    ) {
        searchBox.classList.remove("active");

        setTimeout(() => {
            searchBox.classList.add("d-none");
            searchToggleBtn.classList.remove("d-none");
        }, 250);
    }

});

// функция показа истории транзакций
async function openUsageHistory(certId) {
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
                <td>${u.amount}</td>
                <td>${u.user}</td>
                <td>${u.comment}</td>
            `;
            table.appendChild(tr);
        });
    }

    new bootstrap.Modal(document.getElementById("usageHistoryModal")).show();
}

// работа кнопки "Изменить"
if (editingBtn) {
    document.getElementById("editCertBtn").addEventListener("click", () => {

        if (!selectedRow) return;

        const modalElement = document.getElementById("editCertModal");
        const modal = new bootstrap.Modal(modalElement);

        // ищем поля ТОЛЬКО внутри edit modal
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
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        applyFilter(btn.dataset.filter);
    });
});

function applyFilter(filter) {
    document.querySelectorAll(".cert-row").forEach(row => {
        const status = row.dataset.status;
        const active = row.dataset.active;
        // ===== фильтр вкладок =====
        let visible = true;
        if (filter === "out") {
            visible = (
                active === "false" ||
                active === "null"
            );
        } else {
            if (active !== "true") {
                visible = false;
            }
            if (
                visible &&
                filter !== "all" &&
                status !== filter
            ) {
                visible = false;
            }
        }
        // ===== поиск =====
        if (visible && currentSearch) {
            const rowText = row.innerText.toLowerCase();
            visible = rowText.includes(currentSearch);
        }
        // ===== фильтры колонок =====
        if (visible) {
            const cells = row.querySelectorAll("th, td");
            for (const columnIndex in columnFilters) {
                const filterValue = columnFilters[columnIndex];
                if (!filterValue) continue;
                const cell = cells[parseInt(columnIndex)];
                if (!cell) continue;
                const cellText = cell.innerText.toLowerCase();
                if (!cellText.includes(filterValue)) {
                    visible = false;
                    break;
                }
            }
        }
        row.style.display = visible ? "" : "none";
    });
}

function updateButtonsState() {
    if (editingBtn) {
        editingBtn.disabled = !selectedRow;
    }
    if (issuingBtn) {
        issuingBtn.disabled = !selectedRow;
    }
}

const issueModal = new bootstrap.Modal(document.getElementById('issueCertModal'));

// работа кнопки "Выдача"
if (issuingBtn) {
    issuingBtn.addEventListener("click", () => {
        if (!selectedRow) return;

        document.getElementById("issue_cert_id").value = selectedRow.dataset.id;

        // дат выдачи - сегодня
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("issue_date").value = today;

        issueModal.show();
    });
}

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

// работа кнопки "Списание"
if (spendBtn) {
    spendBtn.addEventListener("click", () => {
        if (!selectedRow) return;
        document.getElementById("spend_cert_id").value = selectedRow.dataset.id;
        document.getElementById("spend_balance").value = selectedRow.dataset.balance;
        document.getElementById("spend_amount").value = "";
        document.getElementById("spend_comment").value = "";
        spendModal.show();
    });
}

// работа кнопки "Вывод"
if (closingBtn) {
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
}

// работа кнопки "Восстановить"
if (restoreBtn) {
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
