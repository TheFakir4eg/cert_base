// /app/static/js/certificates/transaction/tr_state.js

export let transactionItems = [];
export let currentBalance = 0;
export let certificateId = null;
export const transaction = {
    certificate_id: null,
    client_id: null,
    servicegroup_id: null,
    comment: "",
    balance: 0,
    items: []
};

export function clearTransaction() {
    transaction.certificate_id = null;
    transaction.client_id = null;
    transaction.servicegroup_id = null;
    transaction.comment = "";
    transaction.balance = 0;
    transaction.items.length = 0;
    transaction.items = [];
}

// export function addItem() {}

// export function updateItem() {}

// export function removeItem() {}