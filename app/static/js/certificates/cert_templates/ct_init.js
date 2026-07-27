// /static/js/certificates/cert_templates/ct_init.js

import { createTemplateState } from "./ct_state.js";
import { createTemplateDom } from "./ct_dom.js";
import { fetchTemplates } from "./ct_api.js";
import { initTemplateActions } from "./ct_action.js";
import { renderTemplates } from "./ct_render.js";


export function initCertificateTemplates( root, certificateId = null) {
    const state = createTemplateState();
    const dom = createTemplateDom(root);
    state.certificateId = certificateId;

    // if (certificateId) {
    //     state.templates = await fetchTemplates( certificateId);
    // }

    initTemplateActions( state, dom);
    renderTemplates( state, dom);

    // return {
    //     state,
    //     dom,
    // };
    async function load( certificateId) {
        console.log("Загрузка макетов сертификата:", certificateId);
        state.certificateId = certificateId;
        // Загружаем данные
        const fetchedTemplates = await fetchTemplates(certificateId);
        state.templates = fetchedTemplates;
        console.log("Загруженные макеты:", state.templates);
        state.pendingTemplates = [];
        // Сохраняем исходную копию для возможности отмены
        state.initialTemplates = [...fetchedTemplates]; 
        state.deletedTemplateIds.clear(); // Очищаем список удаленных

        renderTemplates( state, dom);
    }

    function reset() {
        state.certificateId = null;
        state.templates = [];
        // Восстанавливаем исходные макеты
        state.pendingTemplates = [];
        state.templates = [...state.initialTemplates];
        state.deletedTemplateIds.clear();

        renderTemplates( state, dom);
    }

    function getPendingTemplates() {
        return state.pendingTemplates;
    }
    function getDeletedTemplateIds() {
        return Array.from(state.deletedTemplateIds);
    }
    return {
        state,
        dom,
        load,
        reset,
        getPendingTemplates,
        getDeletedTemplateIds,
    };
}


