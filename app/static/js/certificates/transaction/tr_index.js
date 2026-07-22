// /app/static/certificates/transaction/tr_index.js

import { renderTransaction } from "./tr_render.js";
import { openTransactionModal, openTransactionItemModal, fillTransactionModal } from "./tr_modal.js";
import { initTransactionItemModal, prepareTransactionItemSelect }from "./tr_item_modal.js";
import { addItem, removeItem } from "./tr_action.js";
import { eventBus } from "../../core/eventBus.js";
import { transaction, clearTransaction, loadCertificateInfo } from "./tr_state.js";

initTransactionItemModal();
//console.log("transaction module loaded");

export function initTransaction() { 
    renderTransaction();
}

eventBus.on(
    "transaction:open",
    async ({id, balance, servicegroupId}) => {
        clearTransaction();
        //console.log(transaction.items);

        //console.log(transactionItems.innerHTML);
        
        transaction.certificate_id = id;
        transaction.balance = Number(balance);
        transaction.servicegroup_id = servicegroupId;

        await loadCertificateInfo(id);

        prepareTransactionItemSelect();
        fillTransactionModal();
        renderTransaction();
        openTransactionModal();
    }
);

const addItemBtn = document.getElementById("transactionAddItemBtn");

if (addItemBtn) {
    addItemBtn.addEventListener( "click", () => {
            openTransactionItemModal();
        });
}

transactionItems.addEventListener("click", (event) => {
    const button = event.target.closest(".transaction-delete");
    if (!button) {
        return;
    }
    const index = Number(button.dataset.index);
    removeItem(index);
});