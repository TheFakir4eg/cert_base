// /app/static/js/certificates/export.js

export function initCertificateExport() {
    const exportButton = document.querySelector("#exportCertificatesBtn");

    if (!exportButton) {
        return;
    }

    exportButton.addEventListener("click", (event) => {
        event.preventDefault();

        const rows = Array.from(
            document.querySelectorAll("#certTableBody tr.cert-row")
        );

        // Берём только видимые строки.
        // Порядок rows уже соответствует текущему порядку таблицы,
        // включая сортировку, выполненную пользователем.
        const visibleIds = rows
            .filter(row => row.offsetParent !== null)
            .map(row => row.dataset.id)
            .filter(Boolean);

        if (!visibleIds.length) {
            alert("Нет сертификатов для выгрузки.");
            return;
        }

        const url = new URL(
            exportButton.href,
            window.location.origin
        );

        // Удаляем возможные старые параметры
        url.search = "";

        // Передаём ID как повторяющийся параметр:
        // ?id=15&id=27&id=31
        visibleIds.forEach(id => {
            url.searchParams.append("id", id);
        });

        window.location.href = url.toString();
    });
}