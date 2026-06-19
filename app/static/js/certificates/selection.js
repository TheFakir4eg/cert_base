// /app/static/js/certificates/selection.js

import * as dom from "./dom.js";
import { openUsageHistory } from "./actions.js";
import { state } from "./state.js";

// обработка клика по строке
dom.tbody.addEventListener("click", (e) => {
    const row = e.target.closest(".cert-row");
    if (!row) return;
    selectRow(row);
});

// обработка двойного клика по строке  - вызов модалки "история транзакций"
dom.tbody.addEventListener("dblclick", async (e) => {
    const row = e.target.closest(".cert-row");
    if (!row) return;
    const certId = row.dataset.id;
    await openUsageHistory(certId);
});


function selectRow(row) {
    document.querySelectorAll(".cert-row").forEach(r => r.classList.remove("table-primary"));

    row.classList.add("table-primary");

    state.selectedRow = row;
    state.selectedCertId = row.dataset.id;

    const active = row.dataset.active === "true";
    const balance = parseFloat(row.dataset.balance);
    const hasClient = row.dataset.clientId && row.dataset.clientId !== "";

    if (dom.editingBtn) {
        dom.editingBtn.disabled = false;
    }

    if (dom.issuingBtn) {
        dom.issuingBtn.disabled = hasClient || !active;
    }

    if (dom.spendBtn) {
        dom.spendBtn.disabled = !hasClient || !active || balance <= 0;
    }

    if (dom.closingBtn) {
        //dom.closingBtn.disabled = !active || balance > 0;
        // UPD 19.06.2026
        // Можно вывести из оборота сертификаты с положительным балансом
        dom.closingBtn.disabled = !active;
    }

    if (dom.restoreBtn) {
        dom.restoreBtn.disabled = active;
    }
}

// обновления видка кнопок в зависимости от состояния строки
function updateButtonsState() {
    if (dom.editingBtn) {
        dom.editingBtn.disabled = !state.selectedRow;
    }
    if (dom.issuingBtn) {
        dom.issuingBtn.disabled = !state.selectedRow;
    }
}