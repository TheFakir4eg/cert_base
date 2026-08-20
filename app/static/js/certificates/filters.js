// /app/static/js/certificates/filters.js

import { state } from "./state.js";

export function getCurrentFilter() {
    const activeBtn = document.querySelector(".filter-btn.active");
    return activeBtn ? activeBtn.dataset.filter : "all";
}

// ===== Вспомогательная функция для парсинга числовых значений =====
function parseNumericValue(str) {
    if (!str) return null;
    
    // Убираем пробелы (разделители тысяч)
    let normalized = str.replace(/\s/g, '');
    
    // Если остались буквы — это не число (например, "ДОНПОД1000")
    if (/[a-zA-Zа-яА-ЯёЁ]/.test(normalized)) return null;
    
    // Заменяем запятую на точку (десятичный разделитель)
    normalized = normalized.replace(',', '.');
    
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
}

export function applyFilter(filter) {
    const currentFilter = filter || getCurrentFilter();

    document.querySelectorAll(".cert-row").forEach(row => {
        const status = row.dataset.status;
        const active = row.dataset.active;
        
        // 1. Фильтр вкладок
        let visible = true;
        if (currentFilter === "out") {
            visible = (active === "false" || active === "null");
        } else {
            if (active !== "true") visible = false;
            if (visible && currentFilter !== "all" && status !== currentFilter) {
                visible = false;
            }
        }
        
        // 2. Глобальный поиск
        if (visible && state.currentSearch) {
            visible = row.innerText.toLowerCase().includes(state.currentSearch);
        }
        
        // 3. Фильтры по колонкам
        if (visible && Object.keys(state.columnFilters).length > 0) {
            const cells = row.querySelectorAll("th, td");
            for (const colIndex in state.columnFilters) {
                const filterValue = state.columnFilters[colIndex];
                if (!filterValue) continue;
                
                const cell = cells[parseInt(colIndex)];
                if (!cell) continue;
                
                const cellText = cell.innerText.trim();
                const cellTextLower = cellText.toLowerCase();
                const filterLower = filterValue.toLowerCase();
                
                // Проверяем, является ли фильтр числовым (цифры, точки, запятые, пробелы)
                const isNumericFilter = /^[\d.,\s]+$/.test(filterValue);
                
                if (isNumericFilter) {
                    // Пытаемся распарсить фильтр как число
                    const filterNum = parseNumericValue(filterValue);
                    // Пытаемся распарсить ячейку как число
                    const cellNum = parseNumericValue(cellText);
                    
                    if (filterNum !== null && cellNum !== null) {
                        // ОБА значения — числа: сравниваем математически
                        // (3000 === 3000.00, 1000 === 1 000)
                        if (filterNum !== cellNum) {
                            visible = false;
                            break;
                        }
                    } else {
                        // Ячейка содержит буквы (например, "ДОНПОД1000")
                        // Извлекаем числовой хвост и сравниваем как строки
                        const match = cellText.match(/(\d+(?:[.,]\d+)?)$/);
                        const cellTail = match ? match[1].replace(',', '.') : null;
                        const filterNormalized = filterValue.replace(/\s/g, '').replace(',', '.');
                        
                        if (cellTail !== filterNormalized) {
                            visible = false;
                            break;
                        }
                    }
                } else {
                    // Текстовый фильтр: частичное совпадение
                    if (!cellTextLower.includes(filterLower)) {
                        visible = false;
                        break;
                    }
                }
            }
        }
        
        row.style.display = visible ? "" : "none";
    });
}

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        // Сохраняем выбранный фильтр в память
        localStorage.setItem(
            "certificatesFilter",
            btn.dataset.filter
        );
        
        applyFilter(btn.dataset.filter);
    });
});
