
import { transaction } from "./tr_state.js";
import { resetTransactionItemModal } from "./tr_item_modal.js";
import { initClientSelect } from "../selection.js";
import { eventBus } from "../../core/eventBus.js";

export const transactionClient = initClientSelect("#transaction_client");

transactionClient.select.on("change", value => {
    transaction.client_id = value || null;
});

eventBus.on("client:created", ({ client, source }) => {
    if (source !== "transaction") {
        return;
    }

    transactionClient.select.addOption({
        value: client.id,
        text: client.name
    });

    transactionClient.select.refreshOptions(false);
    transactionClient.select.setValue(client.id);
});



export function openTransactionItemModal() {
    resetTransactionItemModal();
    const modalElement = document.getElementById("transactionItemModal");
    if (!modalElement) {
        return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

export function openTransactionModal() {
    const modalElement = document.getElementById( "transactionModal");
    if (!modalElement) {
        console.error( "transactionModal not found");
        return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance( modalElement);
    modal.show();
}

export function fillTransactionModal() {
    document.getElementById("transaction_cert_id").value = transaction.certificate_id;
    document.getElementById("transaction_servicegroup_id").value = transaction.servicegroup_id ?? "";
    document.getElementById("transaction_balance").value = transaction.balance.toFixed(2);
}