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



