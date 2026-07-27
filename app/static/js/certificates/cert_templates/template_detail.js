document.addEventListener( "DOMContentLoaded", () => {
        const versionsContainer = document.getElementById( "versionsContainer");
        const availableFilesContainer = document.getElementById( "availableFilesContainer");
        const addVersionButton = document.getElementById( "addVersionButton");
        const createVersionButton = document.getElementById( "createVersionButton");
        const addVersionModal =  new bootstrap.Modal( document.getElementById( "addVersionModal"));

        let selectedFile = null;

        loadVersions();

        async function loadVersions() {
            try {
                const response = await fetch(
                    `/cert_templates/${templateId}/versions`
                );
                if (!response.ok) {
                    throw new Error(
                        "Ошибка загрузки версий"
                    );
                }
                const versions = await response.json();
                renderVersions(versions);
            } catch (error) {
                console.error(error);
                versionsContainer.innerHTML = `
                    <div class="p-4 text-danger">
                        Не удалось загрузить версии
                    </div>
                `;
            }
        }

        function renderVersions(versions) {
            if (!versions.length) {
                versionsContainer.innerHTML = `
                    <div class="p-4 text-muted">
                        Версии ещё не созданы
                    </div>
                `;
                return;
            }
            const rows = versions.map(
                version => {
                    const fileSize = formatFileSize( version.file_size);

                    const status = version.is_active
                            ? `
                                <span
                                    class="badge text-bg-success"
                                >
                                    Активна
                                </span>
                            `
                            : `
                                <span
                                    class="badge text-bg-secondary"
                                >
                                    Архив
                                </span>
                            `;
                    return `
                        <tr>
                            <td>
                                <strong>
                                    v${version.version}
                                </strong>
                            </td>
                            <td>
                                <div>
                                    ${escapeHtml(
                                        version.filename
                                    )}
                                </div>
                                <small
                                    class="text-muted"
                                >
                                    ${escapeHtml(
                                        version.folder_path
                                    )}
                                </small>
                            </td>
                            <td>
                                ${version.mime_type || "—"}
                            </td>
                            <td>
                                ${fileSize}
                            </td>
                            <td>
                                ${status}
                            </td>
                            <td class="text-end">
                                <a
                                    href="/cert_templates/versions/${version.id}/file"
                                    target="_blank"
                                    class="btn btn-sm btn-outline-primary">
                                    Открыть
                                </a>
                                ${version.is_active ? `
                                    <button
                                        type="button"
                                        class="btn btn-sm btn-outline-danger deactivate-version-btn"
                                        data-version-id="${version.id}">
                                        Отключить
                                    </button>
                                ` : ""}
                            </td>
                        </tr>
                    `;
                }
            ).join("");

            versionsContainer.innerHTML = `
                <table class="table table-hover mb-0">
                    <thead>
                        <tr>
                            <th>
                                Версия
                            </th>
                            <th>
                                Файл
                            </th>
                            <th>
                                Тип
                            </th>
                            <th>
                                Размер
                            </th>
                            <th>
                                Статус
                            </th>
                            <th></th>
                        </tr>
                    </thead>

                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;

            versionsContainer.querySelectorAll( ".deactivate-version-btn")
            .forEach(
                button => {
                    button.addEventListener(
                        "click",
                        () => {
                            const versionId = button.dataset.versionId;
                            deactivateVersion( versionId);
                        }
                    );
                }
            );
        }

        
        
        async function deactivateVersion(versionId) 
        {
            const confirmed = confirm( "Отключить эту версию макета?");
            if (!confirmed) {
                return;
            }
            try {
                const response = await fetch(
                    `/cert_templates/versions/${versionId}/deactivate`,
                    {
                        method: "PATCH"
                    }
                );
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(
                        result.error
                        || "Не удалось отключить версию"
                    );
                }
                await loadVersions();
            } catch (error) {
                console.error(error);
                alert( error.message);
            }
        }

        addVersionButton.addEventListener( "click",
            async () => {
                selectedFile = null;
                createVersionButton.disabled = true;
                addVersionModal.show();
                await loadAvailableFiles();
            }
        );


        async function loadAvailableFiles() {
            availableFilesContainer.innerHTML = `
                <div class="text-muted">
                    Загрузка файлов...
                </div>
            `;

            try {
                const response = await fetch(
                    "/cert_templates/files"
                );
                if (!response.ok) {
                    throw new Error(
                        "Ошибка загрузки файлов"
                    );
                }
                const folders =  await response.json();
                renderAvailableFiles( folders);
            } catch (error) {
                console.error(error);
                availableFilesContainer.innerHTML = `
                    <div class="text-danger">
                        Не удалось загрузить список файлов
                    </div>

                `;
            }
        }


        function renderAvailableFiles(
            folders
        ) {
            if (!folders.length) {
                availableFilesContainer.innerHTML = `
                    <div class="text-muted">
                        Доступных файлов нет
                    </div>
                `;
                return;
            }

            let html = "";
            for ( const folder of folders) 
            {
                html += `
                    <h6 class="mt-3">
                        📁 ${escapeHtml( folder.folder)}
                    </h6>
                `;
                for ( const file of folder.files) 
                {
                    const id =
                        "file_"
                        + Math.random()
                            .toString(36)
                            .slice(2);
                    html += `
                        <div class="form-check">
                            <input
                                class="form-check-input"
                                type="radio"
                                name="templateFile"
                                id="${id}"
                                value="${escapeHtml( file.relative_path)}">
                            <label
                                class="form-check-label"
                                for="${id}">
                                ${escapeHtml( file.filename)}
                                <small class="text-muted">
                                    (${file.extension})
                                </small>
                            </label>
                        </div>
                    `;
                }
            }
            availableFilesContainer.innerHTML = html;
            availableFilesContainer.querySelectorAll( 'input[name="templateFile"]')
                    .forEach(
                        radio => {
                            radio.addEventListener(
                                "change",
                                () => {
                                    selectedFile = radio.value;
                                    createVersionButton.disabled = false;
                                }
                            );
                        }
                    );
        }

        createVersionButton.addEventListener(
            "click",
            async () => {
                if (!selectedFile) {
                    return;
                }
                createVersionButton.disabled = true;
                try {
                    const response =
                        await fetch(
                            `/cert_templates/${templateId}/versions`,
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    relative_path:
                                        selectedFile
                                })
                            }
                        );


                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(
                            result.error
                            || "Ошибка создания версии"
                        );
                    }
                    addVersionModal.hide();
                    await loadVersions();
                } catch (error) {
                    console.error(error);
                    alert( error.message);
                    createVersionButton.disabled = false;
                }
            }
        );


        function formatFileSize( bytes) 
        {
            if ( bytes === null || bytes === undefined) 
            {
                return "—";
            }

            if (bytes < 1024) {
                return `${bytes} Б`;
            }
            if (bytes < 1024 * 1024) {
                return (
                    `${( bytes / 1024).toFixed(1)} КБ`
                );
            }

            return (
                `${(
                    bytes
                    / 1024
                    / 1024
                ).toFixed(2)} МБ`
            );

        }

        function escapeHtml(value) 
        {
            const div = document.createElement( "div");
            div.textContent = value ?? "";
            return div.innerHTML;
        }
    }
);