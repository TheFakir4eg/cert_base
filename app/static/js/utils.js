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
    });
}

export function setupBulkFields() {
    const formActionInput = document.getElementById('certFormAction');
    const bulkCheckbox = document.getElementById("mass_bulk");
    const blocks = document.querySelectorAll(
        "#bulkFirstNumberBlock, #bulkLastNumberBlock"
    );
    const inputNumber = document.getElementById("input_number");

    const update = () => {
        blocks.forEach(block =>
            block.classList.toggle("d-none", !bulkCheckbox.checked)
        );
        inputNumber.disabled = bulkCheckbox.checked;
        formActionInput.value = bulkCheckbox.checked ? 'bulk_create' : 'create';
    };

    bulkCheckbox.addEventListener("change", update);
    update(); // выставить состояние при открытии формы
}

