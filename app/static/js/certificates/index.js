// /app/static/js/certificates/index.js

import "./init.js";
import "./search.js";
import "./columnFilters.js";
import "./filters.js";
import "./actions.js";
import "./selection.js";

import "../clients/clients.js";
import { initTransaction } from "./transaction/tr_index.js";

document.addEventListener(
    "DOMContentLoaded",
    () => {
        initTransaction();
    }
);