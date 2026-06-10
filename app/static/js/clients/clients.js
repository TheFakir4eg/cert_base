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

console.log("CLIENTS.JS LOADED");
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
                name: btn.dataset.clientName,
                phone: btn.dataset.clientPhone,
                note: btn.dataset.clientNote
            });
        });
    });

    // SUBMIT
    if (form) {
        form.addEventListener("submit", async (e) => {
            console.log("CLIENT FORM SUBMIT");
            e.preventDefault();

            if (getClientFormAction() !== "create") return;

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
        });
    }    
});