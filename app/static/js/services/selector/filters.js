

import { state } from "./state.js";

export function applyFilters() {
    let result = [...state.allServices];

    if (state.serviceGroupId) {
        result = result.filter(service =>  service.servicegroup_id === state.serviceGroupId);
    }

    if (state.search.trim()) {
        const search = state.search.toLowerCase();
        result = result.filter(service =>
            service.name.toLowerCase().includes(search)
            ||
            (service.code ?? "")
                .toLowerCase()
                .includes(search)
            ||
            (service.note ?? "")
                .toLowerCase()
                .includes(search)
        );
    }
    state.services = result;
}