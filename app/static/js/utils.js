// app/static/js/utils.js

export function showFlash(message, type="success") {
    const container = document.getElementById("flash-container");

    const alert = document.createElement("div");
    alert.className = `alert alert-${type} alert-dismissible fade show shadow`;
    alert.role = "alert";
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    container.appendChild(alert);

    // автозакрытие
    setTimeout(() => {
        alert.classList.remove("show");
        alert.classList.add("hide");
        setTimeout(() => alert.remove(), 500);
    }, 2500);
}

export function money(value) {
    return Number(value).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function setupModalReset(modalId, formId, errorId) {
    // сбрасывает состояние модалки на дефолтное
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    const errorBlock = document.getElementById(errorId);

    //console.log("modal =", modal);

    if (!modal || !form) return;

    // Bootstrap 5.3 + Chrome fix
    modal.addEventListener("hide.bs.modal", () => {
        if (modal.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });

    modal.addEventListener("hidden.bs.modal", () => {
        //console.log("hidden", document.activeElement);
        form.reset();

        if (errorBlock) {
            errorBlock.classList.add("d-none");
            errorBlock.textContent = "";
        }
        document.getElementById("mass_bulk")?.dispatchEvent(
            new Event("change")
        );

        document.getElementById("notnumber")?.dispatchEvent(
            new Event("change")
        );
    });
}

// export function setupBulkFields() {
//     const formActionInput = document.getElementById('certFormAction');
//     const bulkCheckbox = document.getElementById("mass_bulk");
//     const notNumberCheckbox = document.getElementById("notnumber");
//     const blocks = document.querySelectorAll(
//         "#bulkFirstNumberBlock, #bulkLastNumberBlock"
//     );
//     const inputNumber = document.getElementById("input_number");
//     const update = () => {
//         blocks.forEach(block =>
//             block.classList.toggle("d-none", !bulkCheckbox.checked)
//         );
//         inputNumber.disabled = bulkCheckbox.checked;
//         notNumberCheckbox.disabled = bulkCheckbox.checked;
//         formActionInput.value = bulkCheckbox.checked ? 'bulk_create' : 'create';
//     };

//     bulkCheckbox.addEventListener("change", update);
//     update(); // выставить состояние при открытии формы
// }

// export function setupNotNumberFields() {
//     const formActionInput = document.getElementById('certFormAction');
//     const notNumberCheckbox = document.getElementById("notnumber");
//     const bulkCheckbox = document.getElementById("mass_bulk");
//     const blocks = document.querySelectorAll(
//         "#notNumberQty"
//     );
//     const inputNumber = document.getElementById("input_number");

//     const update = () => {
//         blocks.forEach(block =>
//             block.classList.toggle("d-none", !notNumberCheckbox.checked)
//         );
//         inputNumber.disabled = notNumberCheckbox.checked;
//         bulkCheckbox.disabled = notNumberCheckbox.checked;
//         formActionInput.value = notNumberCheckbox.checked ? 'bulk_create' : 'create';
//     };

//     notNumberCheckbox.addEventListener("change", update);
//     update(); // выставить состояние при открытии формы
// }

export function setupCreateMode() {
    const formActionInput = document.getElementById("certFormAction");

    const bulkCheckbox = document.getElementById("mass_bulk");
    const notNumberCheckbox = document.getElementById("notnumber");

    const inputNumber = document.getElementById("input_number");

    const bulkBlocks = document.querySelectorAll( "#bulkFirstNumberBlock, #bulkLastNumberBlock");

    const qtyBlock = document.getElementById("notNumberQty");

    const firstNumber = document.querySelector( 'input[name="first_number"]');
    const lastNumber = document.querySelector( 'input[name="last_number"]');
    const qty = document.querySelector( 'input[name="notnumber-qty"]');

    const update = () => {
        const bulk = bulkCheckbox.checked;
        const withoutNumbers = notNumberCheckbox.checked;

        // Показываем/скрываем блоки
        bulkBlocks.forEach(block =>
            block.classList.toggle("d-none", !bulk)
        );

        qtyBlock.classList.toggle(
            "d-none",
            !withoutNumbers
        );

        // Блокируем взаимоисключающие режимы
        bulkCheckbox.disabled = withoutNumbers;
        notNumberCheckbox.disabled = bulk;

        // Поле номера сертификата
        inputNumber.disabled = bulk || withoutNumbers;

        // Поля диапазона
        firstNumber.disabled = !bulk;
        lastNumber.disabled = !bulk;

        firstNumber.required = bulk;
        lastNumber.required = bulk;

        // Поле количества
        qty.disabled = !withoutNumbers;
        qty.required = withoutNumbers;

        // Режим формы
        formActionInput.value =
            (bulk || withoutNumbers)
                ? "bulk_create"
                : "create";
    };

    bulkCheckbox.addEventListener("change", update);
    notNumberCheckbox.addEventListener("change", update);

    update();
}

