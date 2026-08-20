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
                    const { modal, source } = getClientFormMeta();

                    bootstrap.Modal.getInstance(modal)?.hide();

                    eventBus.emit("client:created", {
                        client: result.client,
                        source
                    });
                }
            }
        });
    }  
//     if (form) {
//         form.addEventListener("submit", async (e) => {
//             console.log("=== CLIENT FORM SUBMIT START ===");

//             try {
//                 e.preventDefault();
//                 e.stopPropagation();

//                 const submitMode = document.getElementById("clientSubmitMode");
//                 const action = getClientFormAction();

//                 console.log("MODE =", submitMode.value);
//                 console.log("ACTION =", action);

//                 if (submitMode.value === "post") {
//                     console.log("POST SUBMIT");
//                     return;
//                 }

//                 if (submitMode.value === "api" && action === "create") {
//                     console.log("STEP 1: get form data");

//                     const data = getClientFormData();

//                     console.log("DATA =", data);
//                     console.log("STEP 2: createClient");

//                     const result = await createClient(data);

//                     console.log("STEP 3: API RESULT =", result);

//                     if (result.success) {
//                         console.log("STEP 4: getClientFormMeta");

//                         const { modal, source } = getClientFormMeta();

//                         console.log("META =", {
//                             modal,
//                             source
//                         });

//                         console.log("STEP 5: emit client:created");

//                         eventBus.emit("client:created", {
//                             client: result.client,
//                             source
//                         });

//                         console.log("STEP 6: emit finished");
//                     }
//                 }

//                 console.log("=== CLIENT FORM SUBMIT END ===");

//             } catch (error) {
//                 console.error("!!! CLIENT CREATE ERROR !!!");
//                 console.error(error);
//                 console.error("STACK:", error?.stack);
//             }
//         });
//     }  
 });