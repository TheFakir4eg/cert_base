// /app/static/js/clients/clients.js

import {
    openCreateClientModal,
    openEditClientModal,
    getClientFormData,
    getClientFormAction,
    getClientFormMeta
} from "./modal.js";

import { createClient } from "./api.js";
import { eventBus } from "../core/eventBus.js";

//console.log("CLIENTS.JS LOADED");
document.addEventListener("DOMContentLoaded", () => {

    const createBtn = document.getElementById("createClientBtn");
    const form = document.getElementById("clientForm");

    // CREATE
    // createBtn.addEventListener("click", () => {
    //     openCreateClientModal();
    // });
    if (createBtn) {
        createBtn.addEventListener("click", () => {
            openCreateClientModal();
        });
    }

    // EDIT
    document.querySelectorAll(".edit-client-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            openEditClientModal({
                id: btn.dataset.clientId,
                full_name: btn.dataset.clientName,
                name: btn.dataset.clientName,
                lastName: btn.dataset.clientLastName,
                firstName: btn.dataset.clientFirstName,
                secondName: btn.dataset.clientSecondName,
                phone: btn.dataset.clientPhone,
                email: btn.dataset.clientEmail,
                externalId: btn.dataset.clientExternalId,
                note: btn.dataset.clientNote
            });
        });
    });

    // SUBMIT
    if (form) {
        form.addEventListener("submit", async (e) => {
            const submitMode = document.getElementById("clientSubmitMode");
            const action = getClientFormAction();
            //console.log("CLIENT FORM SUBMIT");
            
            console.log("MODE =", submitMode.value);
            console.log("ACTION =", action);

            if (submitMode.value === "post") {
                console.log("POST SUBMIT");
                return;
            }
            e.preventDefault();

            //if (getClientFormAction() !== "create") return;
            if (submitMode.value === "api" && action === "create") {
                const data = getClientFormData();
                const result = await createClient(data);

                console.log(result);

                if (result.success) {
                    const { modal } = getClientFormMeta();

                    bootstrap.Modal.getInstance(modal)?.hide();

                    // document.dispatchEvent(new CustomEvent("clientCreated", {
                    //     detail: result.client
                    // }));
                    eventBus.emit("client:created", result.client);
                }
            }
        });
    }    
});