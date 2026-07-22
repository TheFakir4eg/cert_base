// static/js/services/selector/actions.js

import { els } from "./dom.js";
import { resetState, state } from "./state.js";
import { render} from "./render.js";
import { loadServices, loadGroups } from "./api.js";
import { applyFilters } from "./filters.js";

let modal = null;

export function init() {
    if (!els.modal) {
        return;
    }
    modal = new bootstrap.Modal(els.modal);
    bindEvents();
}

export async function open(options = {}) {
    resetState();

    state.selectedIds = options.selectedIds ?? [];
    state.selectedServices = options.selectedServices ?? [];
    state.serviceGroupId = options.serviceGroupId ?? null;
    state.multiple = options.multiple ?? true;
    state.onSave = options.onSave ?? null;
    state.loading = true;
    state.lockGroup = options.lockGroup ?? false;
    state.lockedIds = options.lockedIds || [];

    // console.log("ServiceSelector state:", {
    //     serviceGroupId: state.serviceGroupId,
    //     lockGroup: state.lockGroup
    // });
    render();
    modal.show();

    try {
        const [services, groups] = await Promise.all([
            loadServices(),
            loadGroups()
        ]);

        state.allServices = services;
        state.groups = groups;

        state.selectedServices = state.allServices.filter(
            service => state.selectedIds.includes(service.id)
        );

        applyFilters();

    } catch (error) {
        console.error(error);
        state.allServices = [];
        state.services = [];
    } finally {
        state.loading = false;
        render();
    }
}

export function close() {
    modal.hide();
}

export function save() {
    if (state.onSave) {
        state.onSave(
            state.selectedServices
        );
    }
    //console.log(state.selectedServices);
    close();
}

function onModalHidden() {
    resetState();
    render();
}

function bindEvents() {

    els.search.addEventListener("input", onSearch);
    els.group.addEventListener("change", onGroupChanged);
    els.cancel.addEventListener("click", close);
    els.save.addEventListener("click", save);
    els.modal.addEventListener("hidden.bs.modal", onModalHidden);

}

function onSearch(event) {
    state.search = event.target.value;
    applyFilters();
    render();
}

function onGroupChanged(event) {
    const value = event.target.value;
    state.serviceGroupId = value
            ? Number(value)
            : null;
    applyFilters();
    render();
}