// /static/js/certificates/cert_templates/ct_dom.js

// export const els = { 
//     templatesContainer: document.querySelector( "#certificateTemplatesContainer"),
//     templatesEmpty: document.querySelector( "#certificateTemplatesEmpty"),
//     addButton: document.querySelector( "#certificateTemplatesAddBtn"),
//     selectModal: document.querySelector( "#certificateTemplateSelectModal"),
//     folders: document.querySelector( "#certificateTemplateFolders"),
//     files: document.querySelector( "#certificateTemplateFiles"),
// };


export function createTemplateDom(root) {
    return {
        section: root.querySelector( ".certificate-templates-section"),
        container: root.querySelector( ".certificate-templates-container"),
        empty: root.querySelector( ".certificate-templates-empty"),
        addButton: root.querySelector( ".certificate-templates-add-btn"),
        selectModal: document.querySelector( "#certificateTemplateSelectModal"),
        files: document.querySelector( "#certificateTemplateFiles"),
    };
}