// /app/static/certificates/transaction/tr_modal.js
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

// Заполняет поля формы предустановленными значениями
// export async function fillTransactionModal() {
    
//     // ========== Получаем актуальные данные сертификата ==========
//     const infoResponse = await fetch(`/certificates/${transaction.certificate_id}`);
//     if (!infoResponse.ok) {
//         throw new Error("Не удалось получить данные сертификата");
//     }
//     const certInfo = await infoResponse.json();
//     //console.log("certInfo:", certInfo);
//     document.getElementById("transaction_cert_id").value = transaction.certificate_id;
//     document.getElementById("transaction_servicegroup_id").value = transaction.servicegroup_id ?? "";
//     document.getElementById("transaction_balance").value = transaction.balance.toFixed(2);
//     document.getElementById("certificate_holder").value = certInfo.holder;
// }

// Заполняет поля формы предустановленными значениями
export async function fillTransactionModal() {

    // ========== Получаем актуальные данные сертификата ==========
    const infoResponse = await fetch( `/certificates/${transaction.certificate_id}`);

    if (!infoResponse.ok) {
        throw new Error("Не удалось получить данные сертификата");
    }

    const certInfo = await infoResponse.json();

    document.getElementById("transaction_cert_id").value = transaction.certificate_id;
    document.getElementById("transaction_servicegroup_id").value = transaction.servicegroup_id ?? "";
    document.getElementById("transaction_balance").value = transaction.balance.toFixed(2);
    document.getElementById("certificate_holder").value =  certInfo.holder;
    transaction.max_50_percent = certInfo.max_50_percent === true;

    // ========== Особые условия сертификата ==========
    const options = document.getElementById( "transactionCertificateOptions");
    const singleUseInfo = document.getElementById( "transactionSingleUseInfo");
    const max50PercentInfo = document.getElementById( "transactionMax50PercentInfo");

    // Сначала полностью сбрасываем состояние.
    // Это важно, если одна и та же модалка используется
    // для разных сертификатов.
    options.style.display = "none";
    singleUseInfo.style.display = "none";
    max50PercentInfo.style.display = "none";

    if (certInfo.is_single_use) {
        singleUseInfo.style.display = "";
    }

    if (certInfo.max_50_percent) {
        max50PercentInfo.style.display = "";
    }

    if (certInfo.is_single_use || certInfo.max_50_percent) {
        options.style.display = "";
    }
}

export function resetTransactionModal() {
    transactionClient.select.clear();

    document.getElementById("transaction_comment").value = "";
}