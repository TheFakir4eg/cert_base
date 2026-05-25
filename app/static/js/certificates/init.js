// /app/static/js/init.js

// import { state } from "./state.js";
// import * as dom from "./dom.js";
import {
    applyFilter,
    getCurrentFilter
} from "./filters.js";


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
