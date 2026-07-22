// /app/static/js/certificates/transaction/tr_state.js

export let transactionItems = [];
export let currentBalance = 0;
export let certificateId = null;
export const transaction = {
    certificate_id: null,
    client_id: null,
    servicegroup_id: null,
    spending_type: null,
    comment: "",
    balance: 0,
    items: []
};

export function clearTransaction() {
    transaction.certificate_id = null;
    transaction.client_id = null;
    transaction.servicegroup_id = null;
    transaction.spending_type = null;
    transaction.comment = "";
    transaction.balance = 0;
    transaction.items.length = 0;
    transaction.items = [];
}

export async function loadCertificateInfo(certificate_id) {
    try {
        const response = await fetch(`/certificates/${certificate_id}`);

        if (!response.ok) {
            console.error("Ошибка загрузки данных сертификата");
            return;
        }

        const data = await response.json();
        transaction.spending_type = data.spending_type;
        return data;
    } catch (error) {
        console.error("Ошибка при запросе данных сертификата:", error);
        return null;
    }
}
// export function addItem() {}

// export function updateItem() {}

// export function removeItem() {}