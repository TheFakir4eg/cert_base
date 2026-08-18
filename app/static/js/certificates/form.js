// certificates/form.js

/**
 * Возвращает текущую дату в формате YYYY-MM-DD,
 * чтобы её можно было использовать в input[type="date"].
 */
function getTodayISO() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function initExpirationType(form) {
    const expirationType = form.querySelector("[name=expiration_type]");

    if (!expirationType) {
        return;
    }

    const expirationDateBlock = form.querySelector("#expirationDateBlock");
    const expirationMonthsBlock = form.querySelector("#expirationMonthsBlock");
    const expirationDateInput = form.querySelector("[name=expiration_date]");

    // Запрещаем выбирать даты раньше сегодняшней
    if (expirationDateInput) {
        expirationDateInput.setAttribute("min", getTodayISO());
    }

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

/**
 * Валидация формы сертификата.
 * Возвращает true, если форма корректна.
 */
export function validateCertificateForm(form) {
    let isValid = true;

    const expirationType = form.querySelector("[name=expiration_type]")?.value;
    const expirationDateInput = form.querySelector("[name=expiration_date]");
    const expirationDateError = form.querySelector("#expirationDateError");

    // Сбрасываем предыдущие ошибки
    expirationDateInput?.classList.remove("is-invalid");

    // Проверяем дату только если выбран тип "date"
    if (expirationType === "date" && expirationDateInput) {
        const value = expirationDateInput.value;

        if (!value) {
            expirationDateInput.classList.add("is-invalid");
            if (expirationDateError) {
                expirationDateError.textContent = "Укажите дату окончания.";
            }
            isValid = false;
        } else {
            const today = getTodayISO();
            if (value < today) {
                expirationDateInput.classList.add("is-invalid");
                if (expirationDateError) {
                    expirationDateError.textContent =
                        "Дата окончания не может быть раньше сегодняшней.";
                }
                isValid = false;
            }
        }
    }

    return isValid;
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