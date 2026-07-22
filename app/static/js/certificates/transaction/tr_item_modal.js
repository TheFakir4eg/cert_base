// /static/js/certificates/transaction/tr_item_modal.js
import { addItem } from "./tr_action.js";
import { transaction } from "./tr_state.js";

let serviceSelect = null;
let selectedService = null;

export function initTransactionItemModal() {

    const select = document.getElementById("transactionItemService");
    if (!select) {
        return;
    }
    serviceSelect = new TomSelect(
        select,
        {
            valueField: "id",
            labelField: "name",
            searchField: [
                "name",
                "code"
            ],
            options: [],
            load(query, callback) {
                loadServices(callback);
            }
        }
    );
    serviceSelect.on("change", value => {
        if (!value) {
            selectedService = null;
            return;
        }
        const option = serviceSelect.options[value];

        if (!option) {
            selectedService = null;
            return;
        }
        selectedService = {
            id: value,
            name: option.name,
            code: option.code
        };
        calculateItemAmount();
    });

    document.getElementById("transactionItemQuantity").addEventListener("input", calculateItemAmount);
    document.getElementById("transactionItemPrice").addEventListener( "input", calculateItemAmount);
}

// === НОВАЯ ФУНКЦИЯ: Управление состоянием поля цены ===
export function applyPriceInputState() {
    const priceInput = document.getElementById("transactionItemPrice");
    if (!priceInput) return;

    if (transaction.spending_type === 'count') {
        priceInput.disabled = true;
        priceInput.value = 0;
    } else {
        priceInput.disabled = false;
        // Опционально: можно очищать значение, если тип не 'count'
        // priceInput.value = ''; 
    }
    
    // Пересчитываем сумму, так как значение цены могло измениться программно
    calculateItemAmount();
}

// function loadServices(callback) {
//     const url = transaction.servicegroup_id
//                     ? `/api/services?servicegroup_id=${transaction.servicegroup_id}`
//                     : "/api/services";
//     fetch(url)
//         .then(response => response.json())
//         .then(data => {
//             callback(data);
//         });
// }

function loadServices(callback) {
    // Проверяем, что ID сертификата установлен
    if (!transaction.certificate_id) {
        console.warn("certificate_id не установлен в state транзакции");
        callback([]);
        return;
    }

    // Формируем URL для получения услуг конкретного сертификата
    const url = `/certificates/${transaction.certificate_id}/services`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Ошибка загрузки услуг сертификата");
            }
            return response.json();
        })
        .then(data => {
            // Приводим данные к формату, который ожидает TomSelect (id, name, code)
            // Если ваш бэкенд уже возвращает плоский массив с такими полями, 
            // этот map просто гарантирует безопасность типов.
            const formattedServices = data.map(service => ({
                id: service.id,
                name: service.name,
                code: service.code || "" // Защита от отсутствия code
            }));
            
            callback(formattedServices);
        })
        .catch(error => {
            console.error("Ошибка при загрузке услуг для сертификата:", error);
            callback([]); // Возвращаем пустой массив при ошибке, чтобы TomSelect не завис
        });
}


export function prepareTransactionItemSelect() {

    if (!serviceSelect) {
        return;
    }
    serviceSelect.clear();
    serviceSelect.clearOptions();

    // Применяем правила для поля цены перед открытием модалки
    applyPriceInputState();

    serviceSelect.load(
        (callback) => {
            loadServices(callback);
        }
    );
}

export function calculateItemAmount() {
    const quantity = Number(document.getElementById("transactionItemQuantity").value) || 0;
    const price = Number(document.getElementById("transactionItemPrice").value) || 0;
    const amount = quantity * price;
    document.getElementById("transactionItemAmount").value = amount.toFixed(2);
}

const form = document.getElementById("transactionItemForm");

form.addEventListener("submit", e => {
    e.preventDefault();

    if (!selectedService) {
        alert("Выберите услугу");
        return;
    }
    const quantity = Number(document.getElementById("transactionItemQuantity").value);
    const price = Number(document.getElementById("transactionItemPrice").value);
    addItem({
        service_id: selectedService.id,
        service_name: selectedService.name,
        quantity,
        price,
        amount: quantity * price
    });
    bootstrap.Modal.getInstance(document.getElementById("transactionItemModal")).hide();
    }
);

export function resetTransactionItemModal() {
    selectedService = null;
    document.getElementById("transactionItemQuantity").value = 1;
    //document.getElementById("transactionItemPrice").value = '';
    document.getElementById("transactionItemAmount").value = "0.00";

    if (serviceSelect) {
        serviceSelect.clear();
    }
}