from flask import Blueprint, abort, current_app, flash, jsonify, redirect, render_template, request, url_for, send_file
from flask_login import current_user, login_required
from sqlalchemy.exc import IntegrityError
from pathlib import Path
import mimetypes

from app import db
from app.models import Template, TemplateVersion

templates_bp = Blueprint( "templates",__name__, url_prefix="/cert_templates")

@templates_bp.route("/", methods=["GET"])
@login_required
def list_templates():
    current_app.logger.info( "Доступ к списку макетов сертификатов")

    templates = db.session.execute(
        db.select(Template)
        .order_by(Template.name)
    ).scalars().all()

    return render_template(
        "cert_templates/templates_list.html",
        templates=templates
    )


@templates_bp.route("/create", methods=["POST"])
@login_required
def create_template():
    name = request.form.get("name", "").strip()
    code = request.form.get("code", "").strip()
    description = request.form.get("description", "").strip()

    if not name:
        flash( "Название макета обязательно.", "warning")
        return redirect( url_for("templates.list_templates"))
    if not code:
        flash( "Код макета обязателен.", "warning")
        return redirect( url_for("templates.list_templates"))

    template = Template( name=name, code=code, description=description or None)
    try:
        db.session.add(template)
        db.session.commit()
        flash(
            f'Макет "{template.name}" успешно создан.',
            "success"
        )

    except IntegrityError:
        db.session.rollback()
        flash(
            f'Макет с кодом "{code}" уже существует.',
            "danger"
        )

    except Exception:
        db.session.rollback()
        current_app.logger.exception( "Ошибка при создании макета")
        flash(
            "Не удалось создать макет.",
            "danger"
        )

    return redirect( url_for("templates.list_templates"))
    
@templates_bp.route("/<int:template_id>")
@login_required
# @permission_required("cert_templates_page")
def template_detail(template_id):

    current_app.logger.info( f"Доступ к макету сертификата ID={template_id}")
    template = db.session.get(Template, template_id)

    if template is None:
        flash(
            "Макет не найден.",
            "warning"
        )
        return redirect( url_for("templates.list_templates"))

    return render_template(
        "cert_templates/template_detail.html",
        template=template
    )
    
@templates_bp.route("/files", methods=["GET"])
@login_required
def get_available_template_files():
    base_path = Path( current_app.config["CERTIFICATE_TEMPLATES_PATH"]).resolve()

    current_app.logger.info( "Путь к макетам: %s", base_path)
    current_app.logger.info( "Абсолютный путь: %s", base_path.resolve())
    current_app.logger.info( "Существует: %s, папка: %s", base_path.exists(), base_path.is_dir())

    if not base_path.exists() or not base_path.is_dir():
        return jsonify([])

    allowed_extensions = current_app.config[ "ALLOWED_TEMPLATE_EXTENSIONS"]
    result = []

    for folder in sorted(base_path.iterdir()):
        if not folder.is_dir():
            continue
        files = []
        for file in sorted(folder.iterdir()):
            if not file.is_file():
                continue
            extension = file.suffix.lower()
            if extension not in allowed_extensions:
                continue
            relative_path = file.relative_to(base_path)
            files.append({
                "filename": file.name,
                "relative_path": relative_path.as_posix(),
                "extension": extension,
                "is_image": extension in {
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".webp",
                },
            })
        if files:
            result.append({
                "folder": folder.name,
                "files": files,
            })
    return jsonify(result)

@templates_bp.route( "/<int:template_id>/versions", methods=["POST"])
@login_required
def create_template_version(template_id):
    template = db.session.get( Template, template_id)

    if not template:
        return jsonify({
            "error": "Макет не найден"
        }), 404

    data = request.get_json() or {}
    relative_path = ( data.get("relative_path") or "").strip()

    if not relative_path:
        return jsonify({
            "error": "Не указан файл"
        }), 400

    base_path = Path( current_app.config[ "CERTIFICATE_TEMPLATES_PATH"]).resolve()
    file_path = ( base_path / relative_path).resolve()

    try:
        file_path.relative_to(base_path)

    except ValueError:
        return jsonify({
            "error": "Недопустимый путь"
        }), 400

    if not file_path.is_file():
        return jsonify({
            "error": "Файл не существует"
        }), 400

    extension = file_path.suffix.lower()

    if extension not in current_app.config[
        "ALLOWED_TEMPLATE_EXTENSIONS"
    ]:
        return jsonify({
            "error": "Тип файла не разрешён"
        }), 400

    relative_file_path = ( file_path.relative_to(base_path))
    folder_path = str( relative_file_path.parent)

    if folder_path == ".":
        folder_path = ""

    filename = ( relative_file_path.name)

    last_version = db.session.execute(
        db.select(
            db.func.max(
                TemplateVersion.version
            )
        ).where(
            TemplateVersion.template_id
            == template.id
        )
    ).scalar()

    next_version = ( (last_version or 0) + 1)
    file_size = ( file_path.stat().st_size)

    mime_type, _ = mimetypes.guess_type( file_path.name)

    version = TemplateVersion(
        template_id=template.id,
        version=next_version,
        folder_path=folder_path,
        filename=filename,
        mime_type=mime_type,
        file_size=file_size,
        is_active=True,
        created_by=current_user.id,
    )

    db.session.add(version)
    db.session.commit()

    return jsonify({
        "id": version.id,
        "template_id": version.template_id,
        "version": version.version,
        "folder_path": version.folder_path,
        "filename": version.filename,
        "mime_type": version.mime_type,
        "file_size": version.file_size,
        "is_active": version.is_active,
    }), 201
    
@templates_bp.route( "/<int:template_id>/versions", methods=["GET"])
@login_required
def get_template_versions(template_id):
    template = db.session.get( Template, template_id)

    if not template:
        return jsonify({
            "error": "Макет не найден"
        }), 404

    versions = db.session.execute(
        db.select(TemplateVersion)
        .where(
            TemplateVersion.template_id
            == template.id
        )
        .order_by(
            TemplateVersion.version
        )
    ).scalars().all()

    return jsonify([
        {
            "id": version.id,
            "template_id": version.template_id,
            "version": version.version,
            "folder_path": version.folder_path,
            "filename": version.filename,
            "mime_type": version.mime_type,
            "file_size": version.file_size,
            "is_active": version.is_active,
            "create_date": (
                version.create_date.isoformat()
                if version.create_date
                else None
            ),
            "edit_date": (
                version.edit_date.isoformat()
                if version.edit_date
                else None
            ),
        }
        for version in versions
    ])
    
@templates_bp.route( "/versions/<int:version_id>/file", methods=["GET"])
@login_required
def get_template_version_file(version_id):
    version = db.session.get( TemplateVersion, version_id)
    if not version:
        abort(404)
    if not version.is_active:
        abort(404)
    base_path = Path( current_app.config[ "CERTIFICATE_TEMPLATES_PATH"]).resolve()

    file_path = (
        base_path
        / version.folder_path
        / version.filename
    ).resolve()

    try:
        file_path.relative_to(base_path)

    except ValueError:
        current_app.logger.warning(
            "Попытка выхода за пределы каталога макетов: %s",
            file_path
        )
        abort(404)

    if not file_path.is_file():
        abort(404)
    extension = file_path.suffix.lower()
    if extension not in current_app.config[ "ALLOWED_TEMPLATE_EXTENSIONS"]:
        abort(404)

    return send_file(
        file_path,
        mimetype=version.mime_type,
        conditional=True
    )
    
@templates_bp.route( "/versions/<int:version_id>/deactivate", methods=["PATCH"])
@login_required
def deactivate_template_version(version_id):
    version = db.session.get( TemplateVersion, version_id)

    if not version:
        return jsonify({
            "error": "Версия макета не найдена"
        }), 404

    if not version.is_active:
        return jsonify({
            "error": "Версия уже отключена"
        }), 400

    version.is_active = False

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        current_app.logger.exception(
            "Ошибка при деактивации версии макета %s",
            version_id
        )
        return jsonify({
            "error": "Не удалось отключить версию"
        }), 500

    return jsonify({
        "message": "Версия макета отключена",
        "id": version.id,
        "is_active": version.is_active
    }), 200
    
@templates_bp.route("/active", methods=["GET"])
@login_required
def get_active_templates():
    versions = (
        db.session.execute(
            db.select(TemplateVersion)
            .join(Template)
            .where(
                TemplateVersion.is_active.is_(True)
            )
            .order_by(
                Template.name,
                TemplateVersion.version
            )
        )
        .scalars()
        .all()
    )

    return jsonify([
        {
            "id": version.id,
            "template_id": version.template_id,
            "template_name": version.template.name,
            "template_code": version.template.code,
            "version": version.version,
            "filename": version.filename,
            "folder_path": version.folder_path,
            "mime_type": version.mime_type,
            "file_size": version.file_size,
            "is_active": version.is_active,
        }
        for version in versions
    ])