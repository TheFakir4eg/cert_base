// /app/static/js/certificates/actions.js

import * as dom from "./dom.js";
import { state } from "./state.js";
import { money, showFlash, setupModalReset, setupCreateMode } from "../utils.js";
//import { prepareCreateClientForm } from "../clients/modal.js";
import { eventBus } from "../core/eventBus.js";
import { openCreateClientModal } from "../clients/modal.js";
import { initExpirationType } from "./form.js";
import { initClientSelect } from "./selection.js";
import { transactionClient } from "./transaction/tr_modal.js";
import { getSelectedServices, renderSelectedServices, setEditMode, setCreateMode, setActiveForm } from "./services.js";
import { initCertificateTemplates } from "./cert_templates/ct_init.js";

const confirmModal = new bootstrap.Modal(document.getElementById("confirmActionModal"));
const confirmText = document.getElementById("confirmActionModalText");
const confirmBtn = document.getElementById("confirmActionModalBtn");
const issueClient = initClientSelect("#issue_client");
const spendClient = initClientSelect("#spend_client");

const createForm = document.getElementById("createCertForm");
const createTemplateComponent = initCertificateTemplates(createForm );
const editForm = document.getElementById("editCertForm");
const editTemplateComponent = initCertificateTemplates( editForm );

// обработка двойного клика по строке  - вызов модалки "история транзакций"
dom.tbody.addEventListener("dblclick", async (e) => {
    const row = e.target.closest(".cert-row");
    if (!row) return;
    const certId = row.dataset.id;
    //await openUsageHistory(certId);
    await openTransactionHistory(certId);
});

eventBus.on("client:created", ({ client, source }) => {
    for (const item of [issueClient, spendClient, transactionClient]) {
        item.select.addOption({
            value: client.id,
            text: client.name
        });
        item.select.refreshOptions(false);
    }
    if (source === "issue") {
        issueClient.select.setValue(client.id);
    }
    if (source === "spend") {
        spendClient.select.setValue(client.id);
    }
    if (source === "transaction") {
        transactionClient.select.setValue(client.id);
    }
});

eventBus.on("client:open-create", ({ name, source }) => {
    openCreateClientModal(name, source);
});

// вызов модалки создания клиента внутри модалки выдачи сертификата
const issueCreateClientBtn = document.getElementById("issueCreateClientBtn");

if (issueCreateClientBtn) {
    issueCreateClientBtn.addEventListener("click", () => {
        eventBus.emit("client:open-create", {
            name: issueClient.getSearch(),
            source: "issue"
        });
    });
}

// вызов модалки создания клиента внутри модалки списания средств
const spendCreateClientBtn = document.getElementById("spendCreateClientBtn");

if (spendCreateClientBtn) {
    spendCreateClientBtn.addEventListener("click", () => {
        eventBus.emit("client:open-create", {
            name: spendClient.getSearch(),
            source: "spend"
        });
    });
}
const transactionCreateClientBtn = document.getElementById("transactionCreateClientBtn");
if (transactionCreateClientBtn) {
    transactionCreateClientBtn.addEventListener("click", () => {
        eventBus.emit("client:open-create", {
            name: transactionClient.getSearch(),
            source: "transaction"
        });
    });
}


// новая модалка списания по транзакциям
if (dom.transactionBtn) {
    dom.transactionBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;
        
        const cert = state.selectedRow.dataset;
        //console.log(cert);

        eventBus.emit(
            "transaction:open",
            {
                id: cert.id,
                balance: cert.balance,
                servicegroupId: cert.servicegroupId
            }
        );
    });
}


// функция показа истории транзакций
export async function openUsageHistory(certId) {
    const response = await fetch(`/certificates/${certId}/usages`);
    const data = await response.json();
    const table = document.getElementById("usageHistoryTable");
    const emptyText = document.getElementById("noUsagesText");

    table.innerHTML = "";

    if (data.length === 0) {emptyText.classList.remove("d-none");} 
    else {
        emptyText.classList.add("d-none");
        data.forEach(u => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${u.date}</td>
                <td>${u.client}</td>
                <td>${money(u.amount)}</td>
                <td>${u.user}</td>
                <td class="usage-comment">${u.comment ?? ""}</td>
            `;
            table.appendChild(tr);
        });
    }

    new bootstrap.Modal(document.getElementById("usageHistoryModal")).show();
}

export async function openTransactionHistory(certId) {
    const response = await fetch(`/certificates/${certId}/transaction`);
    const data = await response.json();
    const table = document.getElementById("usageHistoryTable");
    const emptyText = document.getElementById("noUsagesText");

    table.innerHTML = "";

    if (data.length === 0) {
        emptyText.classList.remove("d-none");
    } else {
        emptyText.classList.add("d-none");
        data.forEach(tx => {
            const services = tx.items.map(item => `
                ${item.service_name}
                (${item.quantity} × ${money(item.price)})
            `).join("<br>");

            const tr = document.createElement("tr");

            tr.innerHTML = `
                <td>${tx.date}</td>
                <td>${tx.client}</td>
                <td>${services}</td>
                <td>${money(tx.amount)}</td>
                <td>${tx.user}</td>
                <td class="usage-comment">
                    ${tx.comment ?? ""}
                </td>
            `;
            table.appendChild(tr);
        });
    }
    new bootstrap.Modal(document.getElementById("usageHistoryModal")).show();
}

// работа кнопки "Изменить"
if (dom.editingBtn) {
    dom.editingBtn.addEventListener("click", async () => {
        console.log("Режим редактирования сертифаката");
        try {
            const modalElement = document.getElementById("editCertModal");
            const modal = new bootstrap.Modal(modalElement);
            const form = modalElement.querySelector("form");

            setActiveForm(form);

            const updateExpirationUI = initExpirationType(form);
            if (!state.selectedRow) return;

            console.log(state.selectedRow.dataset);

            const certificateId = state.selectedRow.dataset.id;
            
            const response = await fetch(`/certificates/${certificateId}/services`);

            if (!response.ok) {
                console.error("Ошибка загрузки услуг сертификата");
                return;
            }

            const services = await response.json();

            setEditMode(services);
            renderSelectedServices();
            await editTemplateComponent.load( certificateId);
            //console.log("services:", services);
            // console.log(
            //     "containers:",
            //     document.querySelectorAll("#certificateServices")
            // );
            const expirationType = form.querySelector("[name=expiration_type]");
            const expirationDate = form.querySelector("[name=expiration_date]");

            form.querySelector("[name=cert_id]").value = state.selectedRow.dataset.id;
            form.querySelector("[name=reason]").value = state.selectedRow.dataset.reason;
            form.querySelector("[name=series]").value = state.selectedRow.dataset.series;
            form.querySelector("[name=number]").value = state.selectedRow.dataset.number;

            form.querySelector("[name=place_id]").value = state.selectedRow.dataset.placeId;
            form.querySelector("[name=issue_place_id]").value = state.selectedRow.dataset.issuePlaceId;

            form.querySelector("[name=mol_id]").value = state.selectedRow.dataset.molId;
            
            form.querySelector("[name=spending_type]").value = state.selectedRow.dataset.spendingType;
            form.querySelector("[name=is_single_use]").checked = state.selectedRow.dataset.isSingleUse === "True";
            form.querySelector("[name=require_original]").checked = state.selectedRow.dataset.requireOriginal === "True";
            form.querySelector("[name=require_stamp]").checked = state.selectedRow.dataset.requireStamp === "True";
            form.querySelector("[name=max_50_percent]").checked = state.selectedRow.dataset.maxPercent === "True";

            form.querySelector("[name=total_amount]").value = state.selectedRow.dataset.totalAmount;
            form.querySelector("[name=servicegroup_id]").value = state.selectedRow.dataset.servicegroupId;
            form.querySelector("[name=note]").value = state.selectedRow.dataset.note;

            if (state.selectedRow.dataset.expirationDate) {
                expirationType.value = "date";
                expirationDate.value = state.selectedRow.dataset.expirationDate;
            } else {
                expirationType.value = "unlimited";
            }

            updateExpirationUI();

            //console.log(expirationType.value);
            //console.log(expirationDate.value);
            //console.log(form.querySelector("#expirationDateBlock"));

            modal.show();
        } catch (error) {
            console.error(
                "Ошибка загрузки данных сертификата:",
                error
            );
        }
        
        
    });
}

// работа кнопки "Выдача"
if (dom.issuingBtn) {
    dom.issuingBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;

        document.getElementById("issue_cert_id").value = state.selectedRow.dataset.id;
        // дата выдачи - сегодня
        const today = new Date().toISOString().split('T')[0];
        document.getElementById("issue_date").value = today;
        // очищаем клиента перед показом окна
        //issueClientSelect.clear();
        issueClient.select.clear();
        document.getElementById("issue_note").value = "";
        dom.issueModal.show();       
    });
}

// выдача сертификата. Обработка нажатия "Выдать" в модалке
document.getElementById("issueCertForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        cert_id: document.getElementById("issue_cert_id").value,
        issue_date: document.getElementById("issue_date").value,
        //client_id: document.getElementById("issue_client").value,
        client_id: issueClient.select.getValue(),
        place_id: document.getElementById("issue_place").value,
        note: document.getElementById("issue_note").value
    };

    if (!issueClient.select.getValue()) {
        alert("Выберите клиента");
        return;
    }

    const response = await fetch("/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (response.ok) location.reload();
});

// работа кнопки "Списание"
if (dom.spendBtn) {
    dom.spendBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;
        document.getElementById("spend_cert_id").value = state.selectedRow.dataset.id;
        document.getElementById("spend_balance").value = state.selectedRow.dataset.balance;
        //document.getElementById("spend_client").value = "";
        document.getElementById("spend_amount").value = "";
        document.getElementById("spend_comment").value = "";
        // очищаем клиента перед показом окна
        spendClient.select.clear();
        dom.spendModal.show();
    });
}

const spendForm = document.getElementById("spendCertForm");

if (spendForm) {
    // защита от двойного списания и одновременного использования сертификата 
    let spendInProgress = false;
    //console.log("SPEND HANDLER ATTACHED");
    spendForm.addEventListener("submit", async (e) => {
        //console.log("SUBMIT EVENT", Date.now());
        e.preventDefault();

        if (spendInProgress) {
            return;
        }
        spendInProgress = true;
        if (!spendClient.select.getValue()) {
            alert("Выберите клиента");
            return;
        }
        try {
            const certId = document.getElementById("spend_cert_id").value;

            const data = {
                amount: document.getElementById("spend_amount").value,
                comment: document.getElementById("spend_comment").value,
                client_id: spendClient.select.getValue(),
            };

            const response = await fetch(`/certificates/${certId}/spend`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                if (result.deactivated) {
                    alert("Баланс сертификата = 0\nСертификат автоматически выведен из оборота");
                } else {
                    alert("Средства успешно списаны");
                }
                location.reload();
            } else {
                alert(result.message);
            }
        } finally { spendInProgress = false; }        
    });
}



// работа кнопки "Вывод"
// if (dom.closingBtn) {
//     dom.closingBtn.addEventListener("click", async () => {
//         if (!state.selectedRow) return;

//         const certId = state.selectedRow.dataset.id;
//         const balance = Number( state.selectedRow.dataset.balance);

//         if (balance > 0) {
//             confirmText.textContent = `На сертификате остался баланс ${balance}. Вы уверены, что хотите вывести его из оборота?`;

//             confirmBtn.onclick = async () => {
//                 confirmModal.hide();
//                 await closeCertificate(certId);
//             };

//             confirmModal.show();
//             return;
//         }

//         await closeCertificate(certId);
//     });
// }
if (dom.closingBtn) {
    dom.closingBtn.addEventListener("click", () => {
        if (!state.selectedRow) return;

        const certId = state.selectedRow.dataset.id;
        const balance = Number( state.selectedRow.dataset.balance);
        
        dom.closeText.textContent =
            balance > 0
                ? `На сертификате остался баланс ${balance}. После вывода сертификата эти средства будут потеряны.`
                : "Подтвердите вывод сертификата из оборота.";

        dom.closeNote.value = "";
        dom.closeConfirmBtn.disabled = true;

        dom.closeModal.show();
    });
}

//const closeForm = document.getElementById("closeCertForm");
//const closeNote = document.getElementById("close_note");

if (dom.closeForm) {
    dom.closeForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const certId = state.selectedRow.dataset.id;

        dom.closeModal.hide();

        await closeCertificate(
            certId,
            dom.closeNote.value.trim()
        );
    });
}

if (dom.closeNote) {
    dom.closeNote.addEventListener("input", () => {
        dom.closeConfirmBtn.disabled =
            dom.closeNote.value.trim().length === 0;
    });
}

// работа кнопки "Восстановить"
if (dom.restoreBtn) {
    dom.restoreBtn.addEventListener("click", async () => {
        if (!state.selectedRow) return;

        const certId = state.selectedRow.dataset.id;

        const response = await fetch(`/certificates/${certId}/restore`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();

        if (response.ok) {
            showFlash("Сертификат восстановлен", "success");
            setTimeout(() => location.reload(), 1500);
        } else {
            alert(result.error || "Ошибка");
        }
    });
}

// создание сертификата

if (createForm) {
    setupModalReset(
        "createCertModal",
        "createCertForm",
        "createCertError"
    );
    //setupBulkFields();
    //setupNotNumberFields();
    setupCreateMode();

    createForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBlock = document.getElementById("createCertError");

        errorBlock.classList.add("d-none");
        errorBlock.textContent = "";

        const formData = new FormData(createForm);
        ensureFormData(formData, createForm);

        const series = createForm.elements["series"].value.trim();
        const amount = createForm.elements["total_amount"].value.trim();

        const numbers = series.match(/\d+/g);
        const seriesAmount = numbers?.at(-1);
        
        // Услуги
        const selectedServices = getSelectedServices();
        //console.log("selectedServices:", selectedServices);
        selectedServices.forEach(service => { formData.append("service_ids", service.id);});

        // Макеты
        const pendingTemplates = createTemplateComponent.getPendingTemplates();
        console.log(pendingTemplates);
        formData.append( "templates", JSON.stringify(pendingTemplates));

        if (!Number.isFinite(Number(amount))) {
            errorBlock.textContent = "Номинал должен содержать только цифры";
            errorBlock.classList.remove("d-none");
            return;
        }
        if (seriesAmount && Number(seriesAmount) !== Number(amount)) {
            errorBlock.textContent = `Номинал в серии (${seriesAmount}) не соответствует полю "Номинал" (${amount})`;
            errorBlock.classList.remove("d-none");
            return;
        }
        //console.log("formData: ", formData);
        try {
            const response = await fetch("/certificates", {
                method: "POST",
                body: formData
            });

            //const result = await response.json();
            const result = await response.json().catch(() => null);

            if (!response.ok) {
                errorBlock.textContent = result.message || "Ошибка создания сертификата";
                errorBlock.classList.remove("d-none");
                console.error("SERVER ERROR:", result);
                return;
            }
            sessionStorage.setItem(
                "flashSuccess",
                result.message
            );

            location.reload();
            // setTimeout(() => {
            //     location.reload();
            // }, 1000);
        } catch (error) {
            errorBlock.textContent = "Ошибка соединения с сервером";
            errorBlock.classList.remove("d-none");
        }
    });
}


if (editForm) {
    const seriesField = editForm.querySelector('input[name="series"]');
    const spendingType = editForm.querySelector('select[name="spending_type"]');
    
    seriesField.disabled = true;
    spendingType.disabled = true;

    //let selectedServices = [];

    setupModalReset(
        "editCertModal",
        "editCertForm",
        "editCertError"
    );

    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const errorBlock = document.getElementById("editCertError");

        errorBlock.classList.add("d-none");
        errorBlock.textContent = "";

        const formData = new FormData(editForm);
        ensureFormData(formData, editForm);

        const series = editForm.elements["series"].value.trim();
        const amount = editForm.elements["total_amount"].value.trim();
        const numbers = series.match(/\d+/g);
        const seriesAmount = numbers?.at(-1);

        const selectedServices = getSelectedServices();
        //console.log("selectedServices:", selectedServices);
        selectedServices.forEach(service => { formData.append("service_ids", service.id);});

        // Макеты
        const pendingTemplates = editTemplateComponent.getPendingTemplates();
        formData.append( "templates", JSON.stringify(pendingTemplates));
        // получаем макеты, помеченные на удаление
        const deletedIds = editTemplateComponent.getDeletedTemplateIds(); // Получаем массив ID
        formData.append('deleted_template_ids', JSON.stringify(deletedIds));

        if (!Number.isFinite(Number(amount))) {
            errorBlock.textContent = "Номинал должен содержать только цифры";
            errorBlock.classList.remove("d-none");
            return;
        }
        if (
            seriesAmount &&
            Number(seriesAmount) !== Number(amount)
        ) {
            errorBlock.textContent = `Номинал в серии (${seriesAmount}) не соответствует полю "Номинал" (${amount})`;
            errorBlock.classList.remove("d-none");
            return;
        }

        try {
            const response = await fetch(
                "/certificates",
                {
                    method: "POST",
                    body: formData
                }
            );

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                errorBlock.textContent =
                    result.message ||
                    "Ошибка изменения сертификата";

                errorBlock.classList.remove("d-none");
                return;
            }

            sessionStorage.setItem(
                "flashSuccess",
                result.message
            );

            location.reload();

        } catch (error) {
            errorBlock.textContent =
                "Ошибка соединения с сервером";

            errorBlock.classList.remove("d-none");
        }
    });
}

// async function closeCertificate(certId) {
//     const response = await fetch(
//         `/certificates/${certId}/close`,
//         {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             }
//         }
//     );

//     const result = await response.json();

//     if (response.ok) {
//         showFlash(
//             result.message || "Сертификат успешно выведен",
//             "success"
//         );

//         setTimeout(() => location.reload(), 1500);
//     } else {
//         alert(result.error || "Ошибка");
//     }
// }

async function closeCertificate(certId, comment) {
    const response = await fetch(
        `/certificates/${certId}/close`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                comment: comment
            })
        }
    );

    const result = await response.json();

    if (response.ok) {
        showFlash(
            result.message || "Сертификат успешно выведен",
            "success"
        );

        setTimeout(() => location.reload(), 1500);
    } else {
        alert(result.error || "Ошибка");
    }
}

// Вспомогательная функция для считывания и перезаписывания данных из формы (Bootstrap может терять данные)
// function ensureFormData(formData, form) {
//     form.querySelectorAll('select[name]').forEach(select => {
//         formData.set(select.name, select.value || '');
//     });
// }
// Добавляет в FormData отключённые поля,
// которые стандартно исключаются браузером
function ensureFormData(formData, form) {
    form.querySelectorAll(
        'input[name]:disabled, select[name]:disabled, textarea[name]:disabled'
    ).forEach(field => {
        if (
            field.type === "checkbox" ||
            field.type === "radio"
        ) {
            if (field.checked) {
                formData.set(field.name, field.value);
            }
        } else {
            formData.set(field.name, field.value || "");
        }
    });
}