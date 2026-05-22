// /app/static/js/certificates/filters.js

import { state } from "./state.js";

export function getCurrentFilter() {

    const activeBtn = document.querySelector(".filter-btn.active");

    return activeBtn
        ? activeBtn.dataset.filter
        : "all";
}

export function applyFilter(filter) {

    document.querySelectorAll(".cert-row").forEach(row => {

        const status = row.dataset.status;
        const active = row.dataset.active;

        let visible = true;

        // вкладки
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

        // поиск
        if (visible && state.currentSearch) {

            const rowText = row.innerText.toLowerCase();

            visible = rowText.includes(state.currentSearch);
        }

        // фильтры колонок
        if (visible) {

            const cells = row.querySelectorAll("th, td");

            for (const columnIndex in state.columnFilters) {

                const filterValue = state.columnFilters[columnIndex];

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

export function initFilters() {

    document.querySelectorAll(".filter-btn").forEach(btn => {

        btn.addEventListener("click", () => {

            document.querySelectorAll(".filter-btn")
                .forEach(b => b.classList.remove("active"));

            btn.classList.add("active");

            applyFilter(btn.dataset.filter);
        });
    });

    let activeTab = document.querySelector(".filter-btn.active");

    if (!activeTab) {
        activeTab = document.querySelector(".filter-btn");
    }

    if (activeTab) {
        activeTab.classList.add("active");
        applyFilter(activeTab.dataset.filter);
    }
}