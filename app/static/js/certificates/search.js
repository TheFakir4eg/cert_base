// /app/static/js/certificates/search.js

import {
    searchToggleBtn,
    searchBox,
    searchInput,
    clearSearchBtn
} from "./dom.js";

import { state } from "./state.js";

import { applyFilter, getCurrentFilter } from "./filters.js";

export function initSearch() {

    if (searchToggleBtn && searchBox && searchInput) {

        searchToggleBtn.addEventListener("click", () => {

            searchToggleBtn.classList.add("d-none");

            searchBox.classList.remove("d-none");

            requestAnimationFrame(() => {
                searchBox.classList.add("active");
            });

            searchInput.focus();
        });
    }

    if (clearSearchBtn) {

        clearSearchBtn.addEventListener("click", () => {

            state.currentSearch = "";

            searchInput.value = "";

            applyFilter(getCurrentFilter());

            closeSearch();
        });
    }

    if (searchInput) {

        searchInput.addEventListener("input", () => {

            state.currentSearch = searchInput.value
                .trim()
                .toLowerCase();

            applyFilter(getCurrentFilter());
        });
    }

    document.addEventListener("click", (e) => {

        if (
            searchBox &&
            !searchBox.classList.contains("d-none") &&
            !searchBox.contains(e.target) &&
            e.target !== searchToggleBtn
        ) {
            closeSearch();
        }
    });
}

function closeSearch() {

    searchBox.classList.remove("active");

    setTimeout(() => {

        searchBox.classList.add("d-none");

        searchToggleBtn.classList.remove("d-none");

    }, 250);
}