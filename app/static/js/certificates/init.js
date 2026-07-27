// /app/static/js/init.js

import { initExpirationType, initSpendingType } from "./form.js";
import { applyFilter, getCurrentFilter } from "./filters.js";
import { showFlash } from "../utils.js";
import * as ServiceSelector from "../services/selector/index.js";
import * as CertificateServices from "./services.js";
//import { initCertificateTemplates } from "./cert_templates/ct_init.js";


document.addEventListener("DOMContentLoaded", async () => {
    const createForm = document.querySelector("#createCertModal form");
    const editForm = document.querySelector( "#editCertModal form");

    // подключаем модуль работы с макетами
    //const createTemplateComponent = initCertificateTemplates(createForm);
    //const editTemplateComponent = initCertificateTemplates( editForm);
    // ----
    // модуль работы с услугами сертификата
    ServiceSelector.init();
    CertificateServices.init(createForm);
    CertificateServices.init(editForm);
    //

    if (createForm) {
        const updateExpiration = initExpirationType(createForm);
        const updateSpending = initSpendingType(createForm);

        const modal = document.querySelector("#createCertModal");
        // сбрасываем состояние вложенных элементов при открытии модалки
        modal?.addEventListener(
            "show.bs.modal",
            () => {
                CertificateServices.setCreateMode();
                CertificateServices.setActiveForm(createForm);
                CertificateServices.renderSelectedServices();
            }
        );
        // сбрасываем состояние вложенных элементов при закрытии модалки
        modal?.addEventListener(
            "hidden.bs.modal",
            () => {
                createForm.reset();

                CertificateServices.reset();
                CertificateServices.setCreateMode();
                CertificateServices.setActiveForm(createForm);
                updateExpiration();
                updateSpending();
            }
        );
    }
    const message = sessionStorage.getItem("flashSuccess");

    if (message) {
        showFlash(message, "success");
        sessionStorage.removeItem("flashSuccess");
    }

    // загружаем сохраненный фильтр из памяти
    const savedFilter = localStorage.getItem("certificatesFilter");

    // вкладка по умолчанию
    //let activeTab = document.querySelector(".filter-btn.active");
    let activeTab = savedFilter
        ? document.querySelector(
            `.filter-btn[data-filter="${savedFilter}"]`
        )
        : document.querySelector(".filter-btn.active");

    // если активной нет — берем первую доступную
    if (!activeTab) {
        activeTab = document.querySelector(".filter-btn");
    }

    // сбрасываем предыдущий фильтр
    document
        .querySelectorAll(".filter-btn")
        .forEach(btn => btn.classList.remove("active"));
        
    // применяем фильтр
    if (activeTab) {
        activeTab.classList.add("active");
        applyFilter(activeTab.dataset.filter);
    }

    
});
