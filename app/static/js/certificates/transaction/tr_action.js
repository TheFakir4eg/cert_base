// /app/static/certificates/transaction/tr_action.js

import { renderTransaction } from "./tr_render.js";
import { transaction } from "./tr_state.js";
import { showFlash } from "../../utils.js";

export function addItem(item) {
    transaction.items.push(item);
    console.log(item);
    renderTransaction();
}

export function updateItem(index, item) {
    transaction.items[index] = item;
    renderTransaction();
}

export function removeItem(index) {
    transaction.items.splice(index, 1);
    renderTransaction();
}

const transactionForm = document.getElementById("transactionForm");

if (transactionForm) {
    let transactionInProgress = false;

    transactionForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("SUBMIT TRANSACTION");
        if (transactionInProgress) {
            return;
        }
        if (!transaction.client_id) {
            alert("Выберите клиента");
            console.log("отсутствует клиент");
            return;
        }
        if (transaction.items.length === 0) {
            alert("Добавьте хотя бы одну услугу");
            console.log("отсутствуют услуги");
            return;
        }

        transactionInProgress = true;
        try {

            const certId = transaction.certificate_id;

            // ========== 1. Получаем актуальные данные сертификата ==========
            const infoResponse = await fetch(`/certificates/${certId}`);
            if (!infoResponse.ok) {
                throw new Error("Не удалось получить данные сертификата");
            }
            const certInfo = await infoResponse.json();
            console.log(certInfo);
            // ========== 2. Проверка срока действия ==========
            if (certInfo.expiration_date) {
                const expDate = new Date(certInfo.expiration_date);
                const today = new Date();

                // Приводим обе даты к началу дня для корректного сравнения
                // (без этого new Date() содержит время, и сравнение будет некорректным)
                today.setHours(0, 0, 0, 0);
                expDate.setHours(0, 0, 0, 0);

                if (expDate < today) {
                    alert("Срок действия сертификата истёк.\nСписание невозможно.");
                    return; // прерываем, списание не отправляем
                }
            }
            transaction.comment = document.getElementById("transaction_comment").value;

            const response = await fetch(
                `/certificates/${transaction.certificate_id}/transaction`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        client_id: transaction.client_id,
                        comment: transaction.comment,
                        items: transaction.items.map(item => ({
                            service_id: item.service_id,
                            quantity: item.quantity,
                            price: item.price
                        }))
                    })
                }
            );
            //const result = await response.json();
            let result;

            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("application/json")) {
                result = await response.json();
            } else {
                const text = await response.text();
                console.error("SERVER RESPONSE:", text);
                alert("Ошибка сервера. Смотрите консоль.");
                return;
            }
            if (response.ok) {
                showFlash(
                    "Транзакция успешно проведена",
                    "success"
                );

                setTimeout(() => location.reload(), 200);
            } else {
                alert(result.message);
            }

        } finally {
            transactionInProgress = false;
        }
    });
}
