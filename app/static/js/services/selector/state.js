// static/js/services/selector/state.js

export const state = {
    selectedIds: [],
    selectedServices: [],
    serviceGroupId: null,
    multiple: true,
    search: "",
    services: [], // отображаемый список
    allServices: [],     // полный список
    groups: [],
    loading: false,
    onSave: null,
    lockedIds: [],
    lockGroup: false
};

export function resetState() {
    state.selectedIds = [];
    state.selectedServices = [];
    state.serviceGroupId = null;
    state.multiple = true;
    state.search = "";
    state.services = [];
    state.allServices = [];
    state.loading = false;
    state.onSave = null;
    state.groups = []; 
    state.lockedIds = [];
    state.lockGroup = false;
}