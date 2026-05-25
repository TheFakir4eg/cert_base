// /app/static/js/certificates/columnFilters.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import {
    applyFilter,
    getCurrentFilter
} from "./filters.js";

// Открытие / закрытие popup по клику на "воронку"
document.querySelectorAll(".column-filter-btn")
    .forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const clickedColumn = btn.dataset.column;
            // popup уже открыт на этой же колонке
            if (
                !dom.columnFilterPopup.classList.contains("d-none") &&
                state.currentColumnIndex === clickedColumn
            ) {
                dom.columnFilterPopup.classList.add("d-none");
                state.currentColumnIndex = null;
                return;
            }
            state.currentColumnIndex = clickedColumn;
            const rect = btn.getBoundingClientRect();
            dom.columnFilterPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
            dom.columnFilterPopup.style.left = `${window.scrollX + rect.left - 180}px`;
            dom.columnFilterPopup.classList.remove("d-none");
            dom.columnFilterInput.value = state.columnFilters[state.currentColumnIndex] || "";
            dom.columnFilterInput.focus();
        });
    });

// Применение фильтра
if (dom.applyColumnFilterBtn) {
    if (dom.columnFilterInput) {
        dom.columnFilterInput.addEventListener("keydown", (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            dom.applyColumnFilterBtn.click();
        });
    }
    dom.applyColumnFilterBtn.addEventListener("click", () => {
        if (state.currentColumnIndex === null) return;
        state.columnFilters[state.currentColumnIndex] =dom.columnFilterInput.value.trim().toLowerCase();
        applyFilter(getCurrentFilter());
        updateColumnFilterButtons();
        dom.columnFilterPopup.classList.add("d-none");
    });
}

// Сброс фильтра
if (dom.clearColumnFilterBtn) {
    dom.clearColumnFilterBtn.addEventListener("click", () => {
        if (state.currentColumnIndex === null) return;
        delete state.columnFilters[state.currentColumnIndex];
        applyFilter(getCurrentFilter());
        updateColumnFilterButtons();
        dom.columnFilterPopup.classList.add("d-none");
    });
}

function updateColumnFilterButtons() {

    document.querySelectorAll(".column-filter-btn")
        .forEach(btn => {

            const columnIndex = btn.dataset.column;

            if (state.columnFilters[columnIndex]) {
                btn.classList.add("active-filter");
            } else {
                btn.classList.remove("active-filter");
            }
        });
}

// Закрытие popup и основного поиска при клике мимо ( на любом свободном месте)
document.addEventListener("click", (e) => {
    // Закрытие popup
    if (!dom.columnFilterPopup) return;
    if (
        !dom.columnFilterPopup.contains(e.target)
    ) {
        dom.columnFilterPopup.classList.add("d-none");
    }


});