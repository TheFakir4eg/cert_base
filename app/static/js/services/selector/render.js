// services/selector/render.js

// render.js
// │
// ├── render()
// │
// ├── renderList()
// │   ├── createServiceRow()
// │   ├── createSelector()
// │   └── createBadge()
// │
// ├── renderCounter()
// │
// ├── renderGroups()
// │
// ├── renderLoading()
// │
// ├── renderEmpty()
// │
// └── renderSearch()

import { els } from "./dom.js";
import { state } from "./state.js";

export function render() {
    renderLoading();
    renderGroups();
    renderSearch();
    renderEmpty();
    renderList();
    bindListEvents();
    renderCounter();
}

function toggle(element, show) {
    element.classList.toggle("d-none", !show);
}

function renderLoading() {
    if (state.loading) {
        els.loading.classList.remove("d-none");
        els.list.classList.add("d-none");
        els.empty.classList.add("d-none");
    }
    else {
        els.loading.classList.add("d-none");
        els.list.classList.remove("d-none");
    }
}

function renderSearch() {
    els.search.value = state.search;
}

function renderCounter() {
    els.counter.textContent = `Выбрано: ${state.selectedServices.length}`;
}

function renderEmpty() {
    if (state.loading) {
        els.empty.classList.add("d-none");
        return;
    }
    if (state.services.length === 0) {
        els.empty.classList.remove("d-none");
    }
    else {
        els.empty.classList.add("d-none");
    }
}

function createBadge(service) {
    if (!service.code) {
        return null;
    }

    const badge = document.createElement("span");
    badge.className = "badge text-bg-secondary";
    badge.textContent = service.code;

    return badge;
}

function createSelector(service) {
    const selector = document.createElement("input");
    selector.className = "form-check-input me-3";
    selector.type = state.multiple
        ? "checkbox"
        : "radio";
    if (!state.multiple) {
        selector.name = "selectedService";
    }

    selector.checked = state.selectedIds.includes(service.id);
    selector.disabled = state.lockedIds.includes(service.id);
    selector.dataset.serviceId = service.id;
    return selector;
}

function createInfoBlock(service) {
    const wrapper = document.createElement("div");

    const title = document.createElement("div");
    title.className = "fw-semibold";
    title.textContent = service.name;
    wrapper.appendChild(title);

    if (service.servicegroup) {
        const group = document.createElement("small");
        group.className = "text-muted";
        group.textContent = service.servicegroup.name;
        wrapper.appendChild(group);
    }

    if (service.note) {
        const note = document.createElement("div");
        note.className = "small text-secondary";
        note.textContent = service.note;
        wrapper.appendChild(note);
    }
    return wrapper;
}

function createServiceRow(service) {
    //const row = document.createElement("button");
    const row = document.createElement("div");
    row.type = "button";
    row.className = "list-group-item list-group-item-action";
    row.dataset.serviceId = service.id;

    const content = document.createElement("div");
    content.className = "d-flex justify-content-between align-items-center";

    const left = document.createElement("div");
    left.className = "d-flex align-items-center";
    left.appendChild( createSelector(service));
    left.appendChild( createInfoBlock(service));

    content.appendChild(left);

    const badge = createBadge(service);
    if (badge) {
        content.appendChild(badge);
    }
    //content.appendChild( createBadge(service));
    row.appendChild(content);

    return row;
}

function renderGroups() {
    els.group.innerHTML = "";
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Все группы";
    els.group.appendChild(option);

    for (const group of state.groups) {
        const item = document.createElement("option");
        item.value = group.id;
        item.textContent = group.name;
        els.group.appendChild(item);
    }
    
    els.group.value = state.serviceGroupId ?? "";
    els.group.disabled = state.lockGroup;
}

function renderList() {
    els.list.innerHTML = "";
    for (const service of state.services) {
        const row = createServiceRow(service);
        els.list.appendChild(row);
    }
}

function bindListEvents() {
    const rows = els.list.querySelectorAll("[data-service-id]");

    rows.forEach(row => {
        row.addEventListener( "click",onRowClick);
    });
}

function onRowClick(event) {
    const row = event.currentTarget;
    const id = Number(row.dataset.serviceId);
    toggleService(id);
}

function toggleService(serviceId) {
    if (state.lockedIds.includes(serviceId)) {
        return;
    }
    const service = state.services.find( item => item.id === serviceId);

    if (!service) {
        return;
    }
    const index = state.selectedIds.indexOf(serviceId);

    if (state.multiple) {
        if (index >= 0) {
            state.selectedIds.splice(index, 1);
            state.selectedServices =  state.selectedServices.filter(item => item.id !== serviceId);
        } else {
            state.selectedIds.push(serviceId);
            state.selectedServices.push(service);
        }
    } else {
        state.selectedIds = [serviceId];
        state.selectedServices = [service];
    }
    render();
}




