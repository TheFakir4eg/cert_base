// /app/static/js/certificates/selection.js

import * as dom from "./dom.js";
import { openUsageHistory } from "./actions.js";
import { state } from "./state.js";

dom.tbody.addEventListener("click", (e) => {

    const row = e.target.closest(".cert-row");
    if (!row) return;

    selectRow(row);
});

dom.tbody.addEventListener("dblclick", async (e) => {
    const row = e.target.closest(".cert-row");
    if (!row) return;
    const certId = row.dataset.id;
    await openUsageHistory(certId);
});


function selectRow(row) {

    document.querySelectorAll(".cert-row")
        .forEach(r => r.classList.remove("table-primary"));

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
        dom.closingBtn.disabled = !active || balance > 0;
    }

    if (dom.restoreBtn) {
        dom.restoreBtn.disabled = active;
    }
}

function updateButtonsState() {
    if (dom.editingBtn) {
        dom.editingBtn.disabled = !state.selectedRow;
    }
    if (dom.issuingBtn) {
        dom.issuingBtn.disabled = !state.selectedRow;
    }
}