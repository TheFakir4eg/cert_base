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

    document
        .getElementById("transactionItemQuantity")
        .addEventListener(
            "input",
            calculateItemAmount
        );


    document
        .getElementById("transactionItemPrice")
        .addEventListener(
            "input",
            calculateItemAmount
        );
}

function loadServices(callback) {
    const url = transaction.servicegroup_id
                    ? `/api/services?servicegroup_id=${transaction.servicegroup_id}`
                    : "/api/services";
    fetch(url)
        .then(response => response.json())
        .then(data => {
            callback(data);
        });
}

export function prepareTransactionItemSelect() {

    if (!serviceSelect) {
        return;
    }
    serviceSelect.clear();
    serviceSelect.clearOptions();
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
    document.getElementById("transactionItemPrice").value = '';
    document.getElementById("transactionItemAmount").value = "0.00";

    if (serviceSelect) {
        serviceSelect.clear();
    }
}