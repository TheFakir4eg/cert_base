// /app/static/js/certificates/search.js
import * as dom from "./dom.js";
import { state } from "./state.js";
import {
    applyFilter,
    getCurrentFilter
} from "./filters.js";

//работа кнопки "Поиск" (лупа)
if (dom.searchToggleBtn && dom.searchBox && dom.searchInput) {
    dom.searchToggleBtn.addEventListener("click", () => {
        dom.searchToggleBtn.classList.add("d-none");
        dom.searchBox.classList.remove("d-none");
        requestAnimationFrame(() => {dom.searchBox.classList.add("active");});
        dom.searchInput.focus();
    });
}

if (dom.clearSearchBtn) {
    dom.clearSearchBtn.addEventListener("click", () => {
        state.currentSearch = "";
        dom.searchInput.value = "";
        applyFilter(getCurrentFilter());
        dom.searchBox.classList.remove("active");
        setTimeout(() => {
            dom.searchBox.classList.add("d-none");
            dom.searchToggleBtn.classList.remove("d-none");
        }, 250);
    });
}

if (dom.searchInput) {
    dom.searchInput.addEventListener("input", () => {
        state.currentSearch = dom.searchInput.value.trim().toLowerCase();
        applyFilter(getCurrentFilter());
    });
}

document.addEventListener("click", (e) => {

    // закрытие dom.searchBox
    if (
        dom.searchBox &&
        !dom.searchBox.classList.contains("d-none") &&
        !dom.searchBox.contains(e.target) &&
        e.target !== dom.searchToggleBtn
    ) {
        dom.searchBox.classList.remove("active");

        setTimeout(() => {
            dom.searchBox.classList.add("d-none");
            dom.searchToggleBtn.classList.remove("d-none");
        }, 250);
    }

});