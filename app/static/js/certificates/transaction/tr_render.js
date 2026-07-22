// /app/static/certificates/transaction/tr_render.js

/*renderTransaction()
    ├── renderItems()
    ├── renderTotals()
    └── renderEmptyState()*/
    
import { transaction } from "./tr_state.js";
import {
    itemsContainer as transactionItems,
    emptyLabel as transactionEmpty,
    amount as transactionAmount,
    remaining as transactionRemaining,
} from "./tr_dom.js";

export function renderTransaction() {
    renderItems();
    renderTotals();
    renderEmptyState();
}

function renderItems() {
    transactionItems.innerHTML = "";
    transaction.items.forEach((item, index) => {
        transactionItems.appendChild(
            createItemRow(item, index)
        );
    });
}

function renderTotals() {
    const total = getTransactionTotal();
    transactionAmount.value = total.toFixed(2);
    transactionRemaining.value = (Number(transaction.balance) - total).toFixed(2);
}

function getTransactionTotal() {
    return transaction.items.reduce(
        (sum, item) => sum + Number(item.amount),
        0
    );
}

function renderEmptyState() {
    if (transaction.items.length === 0) {
        transactionItems.appendChild(transactionEmpty);
    }
}

function createItemRow(item, index) {
    const row = document.createElement("div");
    row.className = "list-group-item transaction-item";
    row.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
            <div>
                <div class="fw-semibold">
                    ${item.service_name}
                </div>
                <small class="text-muted">
                    Количество:
                    ${item.quantity}
                    ×
                    ${Number(item.price).toFixed(2)}
                    =
                    ${Number(item.amount).toFixed(2)}
                </small>
            </div>
            <div>    
                <button
                    type="button"
                    class="btn btn-outline-danger transaction-delete"
                    data-index="${index}"
                    title="Удалить">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
    `;
    return row;
}