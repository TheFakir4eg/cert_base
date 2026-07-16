// /app/static/certificates/transaction/tr_index.js

import { renderTransaction } from "./tr_render.js";
import { openTransactionModal, openTransactionItemModal, fillTransactionModal } from "./tr_modal.js";
import { initTransactionItemModal, prepareTransactionItemSelect }from "./tr_item_modal.js";
import { addItem } from "./tr_action.js";
import { eventBus } from "../../core/eventBus.js";
import { transaction, clearTransaction } from "./tr_state.js";

initTransactionItemModal();
//console.log("transaction module loaded");

export function initTransaction() { 
    renderTransaction();
}

eventBus.on(
    "transaction:open",
    ({
        id,
        balance,
        servicegroupId
    }) => {
        clearTransaction();
        //console.log(transaction.items);

        //console.log(transactionItems.innerHTML);
        
        transaction.certificate_id = id;
        transaction.balance = Number(balance);
        transaction.servicegroup_id = servicegroupId;

        prepareTransactionItemSelect();
        fillTransactionModal();
        renderTransaction();
        openTransactionModal();
    }
);

const testBtn = document.getElementById( "transactionTestAddBtn");

if (testBtn) {
    testBtn.addEventListener("click",() => {
            addItem({
                service_id: 1,
                service_name: "Тестовая услуга",
                quantity: 2,
                price: 500,
                amount: 1000
            });
        }
    );
}

const addItemBtn = document.getElementById("transactionAddItemBtn");

if (addItemBtn) {
    addItemBtn.addEventListener( "click", () => {
            openTransactionItemModal();
        });
}