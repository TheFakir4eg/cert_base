// app/static/js/groupModalWindow.js

document.addEventListener("DOMContentLoaded", function () {

    const modalEl = document.getElementById("groupModal");
    const modal = new bootstrap.Modal(modalEl);
    const modalBody = document.getElementById("groupModalBody");
    const modalTitle = document.getElementById("groupModalTitle");

    const createBtn = document.getElementById("createGroupBtn");
    const editButtons = document.querySelectorAll(".edit-group-btn");

    let currentGroupId = null;
    let registryPermissions = []; // все доступные permissions
    let selectedPermissions = new Set(); // permissions выбранные в UI
    let allUsers = []
    let selectedAvailableUser = null
    let selectedGroupUser = null
    let groupData = null;

    // =====================================================
    // ОТКРЫТИЕ МОДАЛКИ
    // =====================================================

    // обработчик нажатия кнопки Создать
    createBtn?.addEventListener("click", () => {
        openCreateModal();
    });

    // обрабтчик нажатия кнопки Изменить
    editButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const id = btn.dataset.groupId;
            const name = btn.dataset.groupName;
            openEditModal(id, name);
        });
    });

    async function openCreateModal() {
        currentGroupId = null;
        modalTitle.textContent = "Создание группы";
        showSpinner();
        modal.show();

        await loadPermissionsRegistry();
        await loadAllUsers();

        groupUsers = [];
        renderModalContent();
        renderUsers([]);
    }

    async function openEditModal(groupId, groupName) {
        currentGroupId = groupId;
        modalTitle.textContent = "Группа: " + groupName;
        //console.log(modalTitle.textContent);
        showSpinner();
        modal.show();

        await loadPermissionsRegistry();
        await loadAllUsers();
        await loadGroupData(groupId);
        const groupUserIds = await loadGroupUsers(groupId)

        renderModalContent();
        renderUsers(groupUserIds);
        console.log (groupUserIds);
        // заполняем поля
        document.getElementById("groupNameInput").value = groupData?.text ?? "";
        document.getElementById("groupNoteInput").value = groupData?.note ?? "";
    }

    function showSpinner() {
        modalBody.innerHTML = `
            <div class="text-center p-5">
                <div class="spinner-border text-primary"></div>
            </div>
        `;
    }

    // =====================================================
    // ЗАГРУЗКА REGISTRY PERMISSIONS
    // =====================================================

    async function loadPermissionsRegistry() {
        const res = await fetch("/api/groups/permissions");
        const data = await res.json();
        registryPermissions = data.sections;
    }

    // загрузка пользователей

    async function loadAllUsers() {
        const res = await fetch("/api/groups/users")
        const data = await res.json()
        allUsers = data.users
    }

    function renderUsers(groupUserIds = []) {

        const availableList = document.getElementById("availableUsers")
        const groupList = document.getElementById("groupUsers")

        availableList.innerHTML = ""
        groupList.innerHTML = ""

        allUsers.forEach(user => {

            const li = document.createElement("li")
            li.textContent = `${user.name} (${user.login})`
            li.dataset.id = user.id

            // пользователь уже состоит в ЭТОЙ группе
            if (groupUserIds.includes(user.id)) {
                groupList.appendChild(li)
                return
            }

            // пользователь состоит в ДРУГОЙ группе
            if (user.group_id && user.group_id !== currentGroupId) {
                li.classList.add("text-muted")
                li.style.pointerEvents = "none"
                availableList.appendChild(li)
                return
            }

            // свободный пользователь
            availableList.appendChild(li)
        })
    }

    async function loadGroupUsers(groupId) {
        const resp = await fetch(`/api/groups/${groupId}/users`)
        const data = await resp.json()
        return data.users
    }

    // =====================================================
    // ЗАГРУЗКА ДАННЫХ ГРУППЫ
    // =====================================================

    async function loadGroupData(groupId) {
        const res = await fetch(`/api/groups/${groupId}`);
        const data = await res.json();

        groupData = data.group; 
        selectedPermissions = new Set(data.permissions);
        //console.log(modalTitle.textContent);
        //console.log(data);

        //  ← добавляем
        // setTimeout(() => {
        //     document.getElementById("groupNameInput").value = data.group.text ?? "";
        //     document.getElementById("groupNoteInput").value = data.group.note ?? "";
        // }, 0);
    }


    function renderModalContent() {
        modalBody.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Название группы</label>
                <input id="groupNameInput" class="form-control">
            </div>

            <div class="mb-4">
                <label class="form-label">Описание</label>
                <textarea id="groupNoteInput" class="form-control"></textarea>
            </div>

            <div class="row">
                <div class="col-md-6">
                    ${renderPermissionsHTML()}
                </div>

                <div class="col-md-6">
                    ${renderDualUsersHTML()}
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                    Отмена
                </button>

                <button type="button" class="btn btn-success" id="saveGroupBtn">
                    Сохранить
                </button>
            </div>
        `;

        initPermissionCheckboxHandlers();
        initUsersHandlers();

        document.getElementById("saveGroupBtn")
            ?.addEventListener("click", saveGroup);
    }


    // =====================================================
    // РЕНДЕР PERMISSIONS UI
    // =====================================================

    function renderPermissionsHTML() {

        let html = `<div id="permissionsContainer">`;

        registryPermissions.forEach(section => {

            html += `
                <div class="card mb-3">
                    <div class="card-header fw-bold">
                        ${section.title ?? section.name}
                    </div>
                    <div class="card-body">
            `;

            section.permissions.forEach(perm => {

                const checked = selectedPermissions.has(perm.name) ? "checked" : "";

                html += `
                    <div class="form-check">
                        <input class="form-check-input permission-checkbox"
                               type="checkbox"
                               value="${perm.name}"
                               id="perm_${perm.name}"
                               ${checked}>
                        <label class="form-check-label" for="perm_${perm.name}">
                            ${perm.title ?? perm.name}
                        </label>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        html += `</div>`;
        return html;
    }

    function renderDualUsersHTML() {
        return `
            <div class="card">
                <div class="card-header fw-bold">Пользователи</div>

                <div class="card-body users-dual-list">

                    <div class="users-column">
                        <div class="users-title">Доступные</div>
                        <ul id="availableUsers" class="users-list"></ul>
                    </div>

                    <div class="users-controls">
                        <button id="addUserBtn" class="btn btn-success">→</button>
                        <button id="removeUserBtn" class="btn btn-danger">←</button>
                    </div>

                    <div class="users-column">
                        <div class="users-title">В группе</div>
                        <ul id="groupUsers" class="users-list"></ul>
                    </div>

                </div>
            </div>
        `;
    }

    // =====================================================
    // ОБРАБОТКА ЧЕКБОКСОВ
    // =====================================================

    function initPermissionCheckboxHandlers() {
        document.querySelectorAll(".permission-checkbox").forEach(cb => {
            cb.addEventListener("change", () => {
                const perm = cb.value;

                if (cb.checked) {
                    selectedPermissions.add(perm);
                } else {
                    selectedPermissions.delete(perm);
                }
            });
        });
    }

    // обработчики пользователей

    function initUsersHandlers() {

        const addBtn = document.getElementById("addUserBtn");
        const removeBtn = document.getElementById("removeUserBtn");

        addBtn?.addEventListener("click", () => {
            if (!selectedAvailableUser) return;

            document.getElementById("groupUsers")
                .appendChild(selectedAvailableUser);

            selectedAvailableUser.classList.remove("selected");
            selectedAvailableUser = null;
        });

        removeBtn?.addEventListener("click", () => {
            if (!selectedGroupUser) return;

            document.getElementById("availableUsers")
                .appendChild(selectedGroupUser);

            selectedGroupUser.classList.remove("selected");
            selectedGroupUser = null;
        });
    }


    

    function collectSelectedPermissions() {
        return Array.from(selectedPermissions);
    }

    function collectSelectedUsers() {
        return Array.from(
            document.querySelectorAll("#groupUsers li")
        ).map(li => Number(li.dataset.id));
    }

    document.addEventListener("click", e => {
        if (!e.target.matches("#availableUsers li, #groupUsers li")) return

        document.querySelectorAll(".users-list li").forEach(li => li.classList.remove("selected"))
        e.target.classList.add("selected")

        if (e.target.parentElement.id === "availableUsers") {
            selectedAvailableUser = e.target
            selectedGroupUser = null
        } else {
            selectedGroupUser = e.target
            selectedAvailableUser = null
        }
    })

    // document.getElementById("addUserBtn").onclick = () => {
    //     if (!selectedAvailableUser) return
    //     document.getElementById("groupUsers").appendChild(selectedAvailableUser)
    //     selectedAvailableUser.classList.remove("selected")
    //     selectedAvailableUser = null
    // }

    // document.getElementById("removeUserBtn").onclick = () => {
    //     if (!selectedGroupUser) return
    //     document.getElementById("availableUsers").appendChild(selectedGroupUser)
    //     selectedGroupUser.classList.remove("selected")
    //     selectedGroupUser = null
    // }

    async function saveGroup() {

        const payload = {
            text: document.getElementById("groupNameInput").value,
            note: document.getElementById("groupNoteInput").value,
            permissions: collectSelectedPermissions(),
            users: collectSelectedUsers()
        };

        let url = "/api/groups";
        let method = "POST";

        if (currentGroupId) {
            url = `/api/groups/${currentGroupId}`;
        }

        const res = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            alert("Ошибка сохранения группы");
            return;
        }

        location.reload();
    }

    

    // =====================================================
    // УДАЛЕНИЕ ГРУППЫ
    // =====================================================

    document.querySelectorAll(".delete-group-btn").forEach(btn => {
        btn.addEventListener("click", async () => {

            const groupId = btn.dataset.groupId;
            const groupName = btn.dataset.groupName;

            const confirmed = confirm(
                `Удалить группу "${groupName}"?\n\n` +
                "Пользователи останутся без группы."
            );

            if (!confirmed) return;

            const res = await fetch(`/api/groups/${groupId}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                alert("Ошибка удаления группы");
                return;
            }

            location.reload();
        });
    });    
});