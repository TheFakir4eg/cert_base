// /app/static/js/certificates/columnFilters.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import { applyFilter, getCurrentFilter } from "./filters.js";

// Открытие / закрытие popup по клику на "воронку"
document.querySelectorAll(".column-filter-btn")
    .forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const clickedColumn = btn.dataset.column;
            // Если кликнули по той же кнопке, которая уже открыта — закрываем
            if (
                !dom.columnFilterPopup.classList.contains("d-none") &&
                state.currentColumnIndex === clickedColumn
            ) {
                dom.columnFilterPopup.classList.add("d-none");
                state.currentColumnIndex = null;
                return;
            }
            state.currentColumnIndex = clickedColumn;

            // Позиционирование
            const rect = btn.getBoundingClientRect();
            let left;
            if (rect.left < 180) {
                // Первая/левая колонка:
                // открываем popup вправо от кнопки
                left = window.scrollX + rect.left;
            } else {
                // Остальные колонки:
                // открываем popup влево
                left = window.scrollX + rect.left - 180;
            }

            dom.columnFilterPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
            dom.columnFilterPopup.style.left = `${left}px`;
            //dom.columnFilterPopup.style.top = `${window.scrollY + rect.bottom + 5}px`;
            //dom.columnFilterPopup.style.left = `${window.scrollX + rect.left - 180}px`;
            dom.columnFilterPopup.classList.remove("d-none");

            dom.columnFilterInput.value = state.columnFilters[state.currentColumnIndex] || "";
            //ставим курсор в текстовое поле
            //dom.columnFilterInput.focus();
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

// ===== 3. Сброс фильтра =====
if (dom.clearColumnFilterBtn) {
    dom.clearColumnFilterBtn.addEventListener("click", () => {
        if (state.currentColumnIndex === null) return;
        
        // 1. Очищаем текстовый фильтр колонки
        delete state.columnFilters[state.currentColumnIndex];
        
        // 2. Восстанавливаем исходный порядок строк в таблице
        restoreOriginalOrder();
        
        // 3. Обновляем видимость строк (на случай, если активен глобальный поиск или фильтры вкладок)
        applyFilter(getCurrentFilter());
        
        // 4. Обновляем иконки фильтров
        updateColumnFilterButtons();
        
        // 5. Закрываем попап и сбрасываем активную колонку
        dom.columnFilterPopup.classList.add("d-none");
        state.currentColumnIndex = null;
    });
}

// ===== Вспомогательная функция для парсинга дат =====
function parseDate(str) {
    if (!str) return null;
    
    str = str.trim();
    
    // Формат DD.MM.YYYY или DD.MM.YYYY HH:MM (российский)
    const ruFormat = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (ruFormat) {
        const [, day, month, year, hours = "0", minutes = "0"] = ruFormat;
        const date = new Date(year, month - 1, day, hours, minutes);
        if (!isNaN(date.getTime())) return date;
    }
    
    // Формат YYYY-MM-DD или YYYY-MM-DDTHH:MM (ISO)
    const isoFormat = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T(\d{1,2}):(\d{2}))?/);
    if (isoFormat) {
        const [, year, month, day, hours = "0", minutes = "0"] = isoFormat;
        const date = new Date(year, month - 1, day, hours, minutes);
        if (!isNaN(date.getTime())) return date;
    }
    
    // Формат DD/MM/YYYY
    const slashFormat = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashFormat) {
        const [, day, month, year] = slashFormat;
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) return date;
    }
    
    return null;
}

function sortTable(direction) {
    if (state.currentColumnIndex === null) return;
    
    const tbody = document.querySelector("tbody"); 
    if (!tbody) return;

    const colIndex = parseInt(state.currentColumnIndex);
    const rows = Array.from(tbody.querySelectorAll(".cert-row"));

    rows.sort((a, b) => {
        const cellsA = a.querySelectorAll("th, td");
        const cellsB = b.querySelectorAll("th, td");

        const textA = cellsA[colIndex]?.innerText.trim() || "";
        const textB = cellsB[colIndex]?.innerText.trim() || "";

        // 1. Пытаемся распарсить как даты
        const dateA = parseDate(textA);
        const dateB = parseDate(textB);

        // Если обе строки — валидные даты, сравниваем их
        if (dateA && dateB) {
            const comparison = dateA.getTime() - dateB.getTime();
            return direction === "asc" ? comparison : -comparison;
        }

        // 2. Пытаемся извлечь числа (для числовой сортировки)
        const numA = parseFloat(textA.replace(/[^\d.-]/g, ''));
        const numB = parseFloat(textB.replace(/[^\d.-]/g, ''));

        if (!isNaN(numA) && !isNaN(numB) && (textA.match(/\d/) && textB.match(/\d/))) {
            return direction === "asc" ? numA - numB : numB - numA;
        }

        // 3. Естественная сортировка для смешанных строк
        const comparison = textA.localeCompare(textB, "ru", { 
            numeric: true, 
            sensitivity: "base" 
        });

        return direction === "asc" ? comparison : -comparison;
    });

    // Перерисовываем строки в DOM в новом порядке
    rows.forEach(row => tbody.appendChild(row));
    
    // ===== СОХРАНЯЕМ СОСТОЯНИЕ СОРТИРОВКИ =====
    state.sortColumn = state.currentColumnIndex;
    state.sortDirection = direction;
    
    applyFilter(getCurrentFilter());
    updateColumnFilterButtons(); // ← Подсвечиваем кнопку
    dom.columnFilterPopup.classList.add("d-none");
    state.currentColumnIndex = null;
}

if (dom.sortAlphaBtn) {
    dom.sortAlphaBtn.addEventListener("click", () => {
        sortTable("asc")
        updateColumnFilterButtons();
    });
}

if (dom.sortOmegaBtn) {
    dom.sortOmegaBtn.addEventListener("click", () => {
        sortTable("desc");
        updateColumnFilterButtons();
    });

}

// ===== 5. Вспомогательные функции =====
function updateColumnFilterButtons() {
    document.querySelectorAll(".column-filter-btn").forEach(btn => {
        const columnIndex = btn.dataset.column;
        
        // Подсвечиваем, если есть текстовый фильтр ИЛИ активна сортировка по этой колонке
        const hasTextFilter = Boolean(state.columnFilters[columnIndex]);
        const isSorted = state.sortColumn === columnIndex;
        
        if (hasTextFilter || isSorted) {
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
    // Закрываем, если клик НЕ по попапу И НЕ по кнопке, которая его открывает
    if (
        !dom.columnFilterPopup.contains(e.target) &&
        !e.target.closest(".column-filter-btn")
    ) {
        dom.columnFilterPopup.classList.add("d-none");
        state.currentColumnIndex = null;
    }

});

// Запоминает исходный порядок строк (вызывать один раз при рендере таблицы)
export function saveInitialOrder() {
    const rows = document.querySelectorAll(".cert-row");
    rows.forEach((row, index) => {
        row.dataset.originalIndex = index;
    });
}

// Восстанавливает исходный порядок строк
function restoreOriginalOrder() {
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll(".cert-row"));

    rows.sort((a, b) => {
        const indexA = parseInt(a.dataset.originalIndex || 0);
        const indexB = parseInt(b.dataset.originalIndex || 0);
        return indexA - indexB;
    });

    rows.forEach(row => tbody.appendChild(row));
    
    // ===== СБРАСЫВАЕМ СОСТОЯНИЕ СОРТИРОВКИ =====
    state.sortColumn = null;
    state.sortDirection = null;
}