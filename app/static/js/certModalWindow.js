// /app/static/js/certModalWindow.js

let selectedRow = null;
let selectedCertId = null;

document.querySelectorAll(".cert-row").forEach(row => {
    row.addEventListener("click", () => {

        // снять старое выделение
        document.querySelectorAll(".cert-row").forEach(r => r.classList.remove("table-primary"));

        // выделить новую строку
        row.classList.add("table-primary");

        selectedRow = row;
        selectedCertId = row.dataset.id;

        // активируем кнопку edit
        document.getElementById("editCertBtn").disabled = false;
    });
});

document.getElementById("editCertBtn").addEventListener("click", () => {

    if (!selectedRow) return;

    const modalElement = document.getElementById("editCertModal");
    const modal = new bootstrap.Modal(modalElement);

    // ⭐ ищем поля ТОЛЬКО внутри edit modal
    const form = modalElement.querySelector("form");

    form.querySelector("[name=cert_id]").value = selectedRow.dataset.id;
    form.querySelector("[name=issue_date]").value = selectedRow.dataset.issueDate;
    form.querySelector("[name=reason]").value = selectedRow.dataset.reason;
    form.querySelector("[name=series]").value = selectedRow.dataset.series;
    form.querySelector("[name=number]").value = selectedRow.dataset.number;
    form.querySelector("[name=total_amount]").value = selectedRow.dataset.totalAmount;
    form.querySelector("[name=place_id]").value = selectedRow.dataset.placeId;
    form.querySelector("[name=servicegroup_id]").value = selectedRow.dataset.servicegroupId;
    form.querySelector("[name=user_id]").value = selectedRow.dataset.userId;
    form.querySelector("[name=note]").value = selectedRow.dataset.note;

    modal.show();
});

document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {

        // убрать active у всех
        document.querySelectorAll(".filter-btn")
            .forEach(b => b.classList.remove("active"));

        // поставить active текущей
        btn.classList.add("active");

        const filter = btn.dataset.filter;

        document.querySelectorAll(".cert-row").forEach(row => {

            const status = row.dataset.status;

            if (filter === "all" || status === filter) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });
    });
});