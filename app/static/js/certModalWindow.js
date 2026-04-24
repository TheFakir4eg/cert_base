// /app/static/js/certModalWindow.js

const issuingBtn = document.getElementById("issuingCertBtn");
const editingBtn = document.getElementById("editCertBtn");
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
        editingBtn.disabled = false;
        issuingBtn.disabled = false;
    });
});

document.getElementById("editCertBtn").addEventListener("click", () => {

    if (!selectedRow) return;

    const modalElement = document.getElementById("editCertModal");
    const modal = new bootstrap.Modal(modalElement);

    // ⭐ ищем поля ТОЛЬКО внутри edit modal
    const form = modalElement.querySelector("form");

    form.querySelector("[name=cert_id]").value = selectedRow.dataset.id;
    form.querySelector("[name=reason]").value = selectedRow.dataset.reason;
    form.querySelector("[name=series]").value = selectedRow.dataset.series;
    form.querySelector("[name=number]").value = selectedRow.dataset.number;
    form.querySelector("[name=total_amount]").value = selectedRow.dataset.totalAmount;
    form.querySelector("[name=servicegroup_id]").value = selectedRow.dataset.servicegroupId;
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



function updateButtonsState() {
    editingBtn.disabled = !selectedRow;
    issuingBtn.disabled = !selectedRow;
}

const issueModal = new bootstrap.Modal(document.getElementById('issueCertModal'));

issuingBtn.addEventListener("click", () => {
    if (!selectedRow) return;

    document.getElementById("issue_cert_id").value = selectedRow.dataset.id;

    // сегодня
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("issue_date").value = today;

    issueModal.show();
});

document.getElementById("issueCertForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
        cert_id: document.getElementById("issue_cert_id").value,
        issue_date: document.getElementById("issue_date").value,
        client_id: document.getElementById("issue_client").value,
        note: document.getElementById("issue_note").value
    };

    const response = await fetch("/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (response.ok) location.reload();
});