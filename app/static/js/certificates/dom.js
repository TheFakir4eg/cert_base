// /app/static/js/certificates/dom.js

export const issuingBtn = document.getElementById("issuingCertBtn");
export const editingBtn = document.getElementById("editCertBtn");
export const spendBtn = document.getElementById("spendCertBtn");
export const closingBtn = document.getElementById("closingCertBtn");
export const restoreBtn = document.getElementById("restoreCertBtn");

export const searchToggleBtn = document.getElementById("searchToggleBtn");
export const searchBox = document.getElementById("searchBox");
export const searchInput = document.getElementById("certSearchInput");
export const clearSearchBtn = document.getElementById("clearSearchBtn");

export const columnFilterPopup = document.getElementById("columnFilterPopup");
export const columnFilterInput = document.getElementById("columnFilterInput");
export const applyColumnFilterBtn = document.getElementById("applyColumnFilterBtn");
export const clearColumnFilterBtn = document.getElementById("clearColumnFilterBtn");

export const tbody = document.getElementById("certTableBody");

export const spendModal = new bootstrap.Modal(
    document.getElementById("spendCertModal")
);

export const issueModal = new bootstrap.Modal(
    document.getElementById("issueCertModal")
);

