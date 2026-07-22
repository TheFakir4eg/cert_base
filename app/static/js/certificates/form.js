// certificates/form.js

export function initExpirationType(form) {
    const expirationType = form.querySelector("[name=expiration_type]");

    if (!expirationType) {
        return;
    }

    const expirationDateBlock = form.querySelector("#expirationDateBlock");
    const expirationMonthsBlock = form.querySelector("#expirationMonthsBlock");

    function updateUI() {
        expirationDateBlock?.classList.add("d-none");
        expirationMonthsBlock?.classList.add("d-none");

        switch (expirationType.value) {
            case "date":
                expirationDateBlock?.classList.remove("d-none");
                break;
            case "months":
                expirationMonthsBlock?.classList.remove("d-none");
                break;
        }
    }
    expirationType.addEventListener("change", updateUI);
    updateUI();
    return updateUI;
}

export function initSpendingType(form) {
    const spendingType = form.querySelector("[name=spending_type]");

    if (!spendingType) {
        return;
    }
    const servicesBlock = form.querySelector("#certificateServicesBlock");
    const servicesSelect = form.querySelector("#certificateServices");

    function updateUI() {
        servicesBlock?.classList.add("d-none");

        if (spendingType.value === "count") {
            servicesBlock?.classList.remove("d-none");
        }
    }

    spendingType.addEventListener("change",updateUI);
    updateUI();
    return updateUI;
}