// /app/static/js/certificates/columnFilters.js

import {
    columnFilterPopup,
    columnFilterInput,
    applyColumnFilterBtn,
    clearColumnFilterBtn
} from "./dom.js";

import { state } from "./state.js";

import { applyFilter, getCurrentFilter } from "./filters.js";

export function initColumnFilters() {

    initPopup();

    initApply();

    initClear();

    initOutsideClick();
}

function initPopup() {

    document.querySelectorAll(".column-filter-btn")
        .forEach(btn => {

            btn.addEventListener("click", (e) => {

                e.stopPropagation();

                const clickedColumn = btn.dataset.column;

                if (
                    !columnFilterPopup.classList.contains("d-none") &&
                    state.currentColumnIndex === clickedColumn
                ) {
                    closePopup();
                    return;
                }

                state.currentColumnIndex = clickedColumn;

                const rect = btn.getBoundingClientRect();

                columnFilterPopup.style.top =
                    `${window.scrollY + rect.bottom + 5}px`;

                columnFilterPopup.style.left =
                    `${window.scrollX + rect.left - 180}px`;

                columnFilterPopup.classList.remove("d-none");

                columnFilterInput.value =
                    state.columnFilters[state.currentColumnIndex] || "";

                columnFilterInput.focus();
            });
        });
}

function initApply() {

    if (!applyColumnFilterBtn) return;

    columnFilterInput.addEventListener("keydown", (e) => {

        if (e.key !== "Enter") return;

        e.preventDefault();

        applyColumnFilterBtn.click();
    });

    applyColumnFilterBtn.addEventListener("click", () => {

        if (state.currentColumnIndex === null) return;

        state.columnFilters[state.currentColumnIndex] =
            columnFilterInput.value.trim().toLowerCase();

        applyFilter(getCurrentFilter());

        updateButtons();

        closePopup();
    });
}

function initClear() {

    if (!clearColumnFilterBtn) return;

    clearColumnFilterBtn.addEventListener("click", () => {

        if (state.currentColumnIndex === null) return;

        delete state.columnFilters[state.currentColumnIndex];

        applyFilter(getCurrentFilter());

        updateButtons();

        closePopup();
    });
}

function initOutsideClick() {

    document.addEventListener("click", (e) => {

        if (
            columnFilterPopup &&
            !columnFilterPopup.contains(e.target)
        ) {
            closePopup();
        }
    });
}

function updateButtons() {

    document.querySelectorAll(".column-filter-btn")
        .forEach(btn => {

            const columnIndex = btn.dataset.column;

            btn.classList.toggle(
                "active-filter",
                !!state.columnFilters[columnIndex]
            );
        });
}

function closePopup() {

    columnFilterPopup.classList.add("d-none");

    state.currentColumnIndex = null;
}