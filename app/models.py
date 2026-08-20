# app/models.py

import os

from flask import current_app

from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app.utils.permission_registry import permission_exists
from sqlalchemy.orm import validates
from sqlalchemy import Numeric, func, UniqueConstraint
from decimal import Decimal
from pathlib import Path
from datetime import datetime
#from zoneinfo import ZoneInfo  # Python 3.9+
import pytz

class TimestampMixin:
    create_date = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(pytz.timezone("Europe/Moscow"))
    )
    edit_date = db.Column(
        db.DateTime(timezone=True), 
        default=lambda: datetime.now(pytz.timezone("Europe/Moscow")),
        onupdate=lambda: datetime.now(pytz.timezone("Europe/Moscow"))
    )

# class TimestampMixin:
#     create_date = db.Column(db.DateTime, default=lambda: datetime.now())
#     edit_date = db.Column(db.DateTime, default=lambda: datetime.now(), onupdate=lambda: datetime.now())
    
class Certificate(db.Model, TimestampMixin): # Модель для таблицы certificates
    """Сертификаты
        Основная таблица БД

    Args:
        id: Идентификатор
        issue_date (db.Date): Дата выдачи сертификата
        reason (db.String(20)): Причина выдачи сертификата
        

    """
    __tablename__ = 'certificates'
    __table_args__ = (
        UniqueConstraint('series', 'number', name='uq_certificate_series_number'),
    )
    id = db.Column(db.Integer, primary_key=True)
    # создание сертификата
    #create_date = db.Column(db.DateTime, default=lambda: datetime.now()) # Дата создания. Записывается в бд автоматически. 
    reason = db.Column(db.String(100), nullable=True) # Причина создания сертификата
    series = db.Column(db.String(20), nullable=False) # серия сертификата 
    number = db.Column(db.String(20), nullable=True) # номер сертификата

    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True) # Внешний ключ, место создания сетрификата
    issue_place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True) # Внешний ключ, место выдачи сертификата
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # Внешний ключ, пользователь, создавший сертификат
    mol_id = db.Column(db.Integer,db.ForeignKey("users.id"), nullable=True) # Внешний ключ, МОЛ - материально ответственное лицо - кому передали сертификат при создании
    expiration_date = db.Column(db.Date, nullable=True) # Срок действия сертификата
    servicegroup_id = db.Column(db.Integer, db.ForeignKey('servicegroup.id'), nullable=True) # Внешний ключ, группа услуг
    # выдача клиенту
    issue_date = db.Column(db.Date) # Дата выдачи сертификата клиенту
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True) # Внешний ключ, держатель сертификата (клиент, которому его выдали)
    spending_client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True) # Внешний ключ, клиент, который расплачивается сертификатом
    #редактирование
    #edit_date = db.Column(db.DateTime, default=lambda: datetime.now(), onupdate=datetime.now()) # Дата изменения. Записывается в бд автоматически. 
    edit_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Внешний ключ, пользователь, изменивший сертификат. Может отличаться от создателя
    # финансы
    total_amount = db.Column(Numeric(10,2), nullable=False)
    spending_type = db.Column(db.String(20),nullable=False,default='money') # money / count - тип списания
    
    note = db.Column(db.String(250), nullable=True) # Комментарий
    template_path = db.Column(db.String(255), nullable=True) # Путь к файлу шаблона сертификата
    require_original = db.Column(db.Boolean,default=False,nullable=False)
    require_stamp = db.Column(db.Boolean,default=False,nullable=False)
    is_single_use = db.Column(db.Boolean,default=False,nullable=False)
    max_50_percent = db.Column(db.Boolean,default=False,nullable=False)
    
    active = db.Column(db.Boolean, default=True, nullable=False) # показатель активности (для вывода из оборота)
    deactivate_reason = db.Column(db.String(100),nullable=True) # Причина деактивации
    
    # Отношения между таблицами
    
    # кто создал сертификат
    creator = db.relationship(
        'User',
        foreign_keys=[user_id],
        backref='created_certificates'
    )
    # кто редактировал сертификат
    editor = db.relationship(
        'User',
        foreign_keys=[edit_user_id],
        backref='edited_certificates'
    )
    # МОЛ - материально ответственное лицо
    mol = db.relationship(
        'User',
        foreign_keys=[mol_id],
        backref='received_certificates'
    )
    # держатель сертификата
    holder = db.relationship(
        "Client",
        foreign_keys=[client_id],
        back_populates="held_certificates"
    )
    # Плательщик
    spender = db.relationship(
        "Client",
        foreign_keys=[spending_client_id],
        back_populates="spent_certificates"
    )
    # Место создания 
    creating_place = db.relationship(
        "Place",
        foreign_keys=[place_id],
        back_populates="created_certificates"
    )
    # Место выдачи
    issuing_place = db.relationship(
        "Place",
        foreign_keys=[issue_place_id],
        back_populates="issued_certificates"
    )
    
    transactions = db.relationship(
        "CertificateTransaction",
        back_populates="certificate",
        cascade="all, delete-orphan",
        lazy=True
    )
    # связь с таблицей УслугиСертификата
    certificate_services = db.relationship(
        "CertificateService",
        back_populates="certificate",
        cascade="all, delete-orphan",
        lazy=True
    )
    # связь с таблицей МакетСертификата
    # старая версия проекта! готовится к удалению
    certificate_templates = db.relationship(
        "CertificateTemplate",
        back_populates="certificate",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    #====================
    # Новая версия связи макета с сертификатом
    template_links = db.relationship(
        "CertificateTemplateLink",
        back_populates="certificate",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    template_versions = db.relationship(
        "TemplateVersion",
        secondary="certificate_template_links",
        back_populates="certificates"
        ,lazy="selectin"
        ,overlaps="template_links"
        #,overlaps="certificate_links,template_links"
    )
    # сумма списаний
    # !!! потенциально опасное место
    # при большом количестве сертификатов есть риск замедления работы
    # SELECT certificate_id, SUM(amount)
    # FROM certificate_transaction_items
    # GROUP BY certificate_id
    @property
    def used_amount(self):
        result = (
            db.session.query(
                func.coalesce(
                    func.sum(CertificateTransactionItem.amount),
                    0
                )
            )
            .join(
                CertificateTransaction,
                CertificateTransaction.id == CertificateTransactionItem.transaction_id
            )
            .filter(
                CertificateTransaction.certificate_id == self.id
            )
            .scalar()
        )

        return Decimal(result)
    # @property
    # def used_amount(self):
    #     result = db.session.query(
    #         func.coalesce(func.sum(CertificateUsage.amount), 0)
    #     ).filter(
    #         CertificateUsage.certificate_id == self.id
    #     ).scalar()
        
    #     return Decimal(result)
    #     #return result
    
    # отображение номера сертификата
    @property
    def display_number(self):
        return self.number or "не присвоен"

    # баланс
    @property
    def balance(self):
        return self.total_amount - self.used_amount
    
    def __repr__(self):
        return f'<Certificate {self.number}>'
    
class User(db.Model, UserMixin, TimestampMixin): 
    """таблица пользователей

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), nullable=False, unique=True) # логин пользователя
    name = db.Column(db.String(50), nullable=False) # данные ФИО
    password_hash = db.Column(db.String(255)) # поле для хеша пароля
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # Внешний ключ, группы прав пользователя
    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True) # Внешний ключ, место работы пользователя
    note = db.Column(db.String(250), nullable=True)
    #create_date = db.Column(db.DateTime, default=lambda: datetime.now())
    active = db.Column(db.Boolean, default=True, nullable=False) # статус активности учетной записи
    created_by = db.Column(
        db.Integer, 
        db.ForeignKey('users.id', ondelete='SET NULL'), 
        nullable=True
    )
    # Отношение "многие к одному": многие пользователи принадлежат одной группе
    # используем back_populates='users', которое ссылается на атрибут в Group
    user_group = db.relationship('Group', back_populates='users') 
    user_place = db.relationship('Place', back_populates='users') 
    # Самоссылающееся отношение: кто создал этого пользователя
    creator = db.relationship(
        'User', 
        foreign_keys=[created_by], # Указываем, какое именно поле является FK
        remote_side=[id]           # Указываем, на какой столбец мы ссылаемся
    )
    # Метод для установки пароля (хранится как хеш)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    # Метод для проверки пароля
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    # Переопределяем метод is_active из модуля UserMixin
    @property
    def is_active(self):
        return self.active # Метод возвращает True, если active = True
    
    # Проверка наличия разрешения у пользователя
    def has_permission(self, permission_name: str) -> bool:
        if not self.group_id:
            return False

        if not hasattr(self, "_perm_cache"):
            rows = db.session.execute(
                db.select(GroupPermission.permission_name)
                .filter_by(group_id=self.group_id)
            ).scalars().all()

            self._perm_cache = set(rows)

        return permission_name in self._perm_cache
    
    def __repr__(self):
        return f'<User {self.name}>'
    
class Group(db.Model, TimestampMixin): 
    """группы прав пользователей

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(50), nullable=False)
    note = db.Column(db.String(250), nullable=True)
    # --- Добавляем relationship для связи с Users ---
    # Отношение "один ко многим": одна группа может иметь много пользователей
    # Используем back_populates для двустороннего доступа
    users = db.relationship('User', back_populates='user_group', lazy=True) # Список пользователей в этой группе
    # В модели Users обратная ссылка: user_group = db.relationship('Groups', back_populates='users')

    # permissions = db.relationship(
    #     "GroupPermission",
    #     backref="group",
    #     lazy=True
    # )
    permissions = db.relationship(
        "GroupPermission", 
        backref="group",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    def __repr__(self):
        return f'<Group {self.text}>'

class GroupPermission(db.Model, TimestampMixin):
    """Связь групп и разрешений (many-to-many через строку permission_name)"""
    __tablename__ = "group_permissions"

    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    permission_name = db.Column(db.String(100), nullable=False)

    __table_args__ = (
        db.UniqueConstraint("group_id", "permission_name", name="unique_group_permission"),
    )

    @validates("permission_name")
    def validate_permission(self, key, permission_name):
        if not permission_exists(permission_name):
            raise ValueError(f"Permission '{permission_name}' not found in registry")
        return permission_name
    
    def __repr__(self):
        return f"<GroupPermission {self.group_id}:{self.permission_name}>"


class Place(db.Model, TimestampMixin): # Модель для таблицы places
    """место выдачи сертификата

    Args:
        db (_type_): _description_

    Returns:
        _type_: _description_
    """
    __tablename__ = 'places'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    address = db.Column(db.String(200), nullable=True) # Может быть nullable=True, если адрес не обязателен
    note = db.Column(db.String(250), nullable=True)
    
    # Отношение "один ко многим": одно место может иметь много сертификатов
    # backref автоматически создает атрибут 'place' в модели Certificate,
    # позволяющий получить объект Place для конкретного Certificate
    #certificates = db.relationship('Certificate', backref='place', lazy=True)
    
    created_certificates = db.relationship(
        "Certificate",
        foreign_keys="Certificate.place_id",
        back_populates="creating_place"
    )
    issued_certificates = db.relationship(
        "Certificate",
        foreign_keys="Certificate.issue_place_id",
        back_populates="issuing_place"
    )

    users = db.relationship(
        'User',
        back_populates='user_place'
    )
    def __repr__(self):
        return f'<Place {self.name}>'
    
# 14.04.2026 Полностью удалены таблицы Resourses, Permissions
    

            
class ServiceGroup(db.Model, TimestampMixin):
    """_summary_

    Args:
        db (_type_): _description_
    """
    __tablename__ = "servicegroup"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(250))

    certificates = db.relationship(
        "Certificate",
        backref="servicegroup",
        lazy=True
    )

    services = db.relationship(
        "Services",
        back_populates="servicegroup",
        cascade="save-update, merge", # Убрали delete-orphan
        passive_deletes=True
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name
        }
    
class Client(db.Model, TimestampMixin):
    """Клиенты. Люди, которым выданы сетрификаты

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    lastName = db.Column(db.String(50), nullable=True)
    firstName = db.Column(db.String(50), nullable=True)
    secondName = db.Column(db.String(50), nullable=True)
    phone = db.Column(db.String(12), nullable=True)
    email = db.Column(db.String(50), nullable=True)
    externalId = db.Column(db.String(50), nullable=True)
    
    note = db.Column(db.String(250), nullable=True)
    
    #certificates = db.relationship('Certificate', backref='client', lazy=True)
    held_certificates = db.relationship(
        "Certificate",
        foreign_keys="Certificate.client_id",
        back_populates="holder"
    )

    spent_certificates = db.relationship(
        "Certificate",
        foreign_keys="Certificate.spending_client_id",
        back_populates="spender"
    )
    
    @property
    def full_name(self):
        result =  " ".join(
            filter(
                None,
                [self.lastName, self.firstName, self.secondName]
            )
        )
        return result or self.name
        
    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "lastName": self.lastName,
            "firstName": self.firstName,
            "secondName": self.secondName,
            "phone": self.phone,
            "email": self.email,
            "externalId": self.externalId,
            "note": self.note,
        }
    
class CertificateUsage(db.Model, TimestampMixin):
    """Операции списания средств с сертификата"""
    __tablename__ = "certificate_usages"

    id = db.Column(db.Integer, primary_key=True)

    certificate_id = db.Column(
        db.Integer,
        db.ForeignKey("certificates.id", ondelete="CASCADE"),
        nullable=False
    )
    client_id = db.Column(
        db.Integer,
        db.ForeignKey("clients.id", ondelete="CASCADE"),
        nullable=True
    )
    amount = db.Column(Numeric(10,2), nullable=False)  # сумма списания
    comment = db.Column(db.String(255), nullable=True)

    # created_at = db.Column(
    #     db.DateTime,
    #     default=lambda: datetime.now(),
    #     nullable=False
    # )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    # связи
    certificate = db.relationship("Certificate", backref="usages")
    client = db.relationship("Client", backref="usages")
    user = db.relationship("User")

    def __repr__(self):
        return f"<CertificateUsage cert={self.certificate_id} amount={self.amount}>"
    
class CertificateSeries(db.Model, TimestampMixin):
    """
    Служебная таблица для учета безномерных сертификатов.

    last_number — последний автоматически присвоенный номер.

    max_number — максимально допустимое количество сертификатов ыданной серии.
    """
    __tablename__ = "certificate_series"

    id = db.Column(db.Integer, primary_key=True)
    series = db.Column(db.String(20), unique=True, nullable=False)
    last_number = db.Column(db.Integer, nullable=False, default=0)
    max_number = db.Column(db.Integer, nullable=True)
    
class Services(db.Model, TimestampMixin):
    """_summary_

    Args:
        db (_type_): _description_
    """
    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(250), nullable=False)
    code = db.Column(db.String(20), unique=True, nullable=True)
    servicegroup_id = db.Column( db.Integer, db.ForeignKey("servicegroup.id", ondelete="CASCADE"), nullable=False, index=True)
    note = db.Column(db.String(250))
    is_active = db.Column(db.Boolean, default=True, nullable=False, index=True)
    mis_id = db.Column(db.String(20), unique=True, nullable=True)
    
    servicegroup = db.relationship(
        "ServiceGroup",
        back_populates="services"
    )
    
    transaction_items = db.relationship(
        "CertificateTransactionItem",
        back_populates="service"
    )
    
    @property
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "note": self.note,
            "is_active": self.is_active,
            "mis_id": self.mis_id,
            "servicegroup_id": self.servicegroup_id,
            "servicegroup": {
                "id": self.servicegroup.id,
                "name": self.servicegroup.name,
            } if self.servicegroup else None
        }
    
class CertificateTransaction(db.Model, TimestampMixin):
    __tablename__ = "certificate_transactions"

    id = db.Column(db.Integer, primary_key=True)
    certificate_id = db.Column( db.Integer, db.ForeignKey("certificates.id", ondelete="CASCADE"), nullable=False, index=True)
    client_id = db.Column( db.Integer, db.ForeignKey("clients.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = db.Column( db.Integer, db.ForeignKey("users.id"), nullable=False)
    #created_at = db.Column( db.DateTime, default=datetime.now, nullable=False, index=True)
    comment = db.Column(db.String(255))
    
    certificate = db.relationship( "Certificate", back_populates="transactions")
    client = db.relationship( "Client", foreign_keys=[client_id])
    user = db.relationship( "User", foreign_keys=[user_id])
    items = db.relationship(
        "CertificateTransactionItem",
        back_populates="transaction",
        cascade="all, delete-orphan",
        passive_deletes=True
    )
    
    def __repr__(self):
        return f"<CertificateTransaction {self.id}>"

    
class CertificateTransactionItem(db.Model, TimestampMixin):
    __tablename__ = "certificate_transaction_items"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column( db.Integer, db.ForeignKey("certificate_transactions.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = db.Column( db.Integer, db.ForeignKey("services.id"), nullable=False, index=True)
    service_name = db.Column( db.String(250), nullable=False)
    quantity = db.Column( Numeric(10, 2), default=1, nullable=False)
    price = db.Column(Numeric(10, 2), nullable=False)
    amount = db.Column( Numeric(10, 2), nullable=False)

    transaction = db.relationship(
        "CertificateTransaction",
        back_populates="items"
    )

    service = db.relationship(
        "Services",
        back_populates="transaction_items",
        lazy="joined"
    )
    
    def __repr__(self):
        return (
            f"<CertificateTransactionItem "
            f"{self.service_name} "
            f"{self.quantity}"
            f"{self.price}"
            f"{self.amount}>"
        )
        
class CertificateService(db.Model, TimestampMixin):
    """ услуги, связанные с сертификатом

    Args:
        db (_type_): _description_
    """
    __tablename__ = "certificate_services"
    __table_args__ = (
        UniqueConstraint("certificate_id","service_id",name="uq_certificate_service"), #только одна уникальная услуга может быть добавлена
    )
    id = db.Column(db.Integer, primary_key=True)
    certificate_id = db.Column(db.Integer,db.ForeignKey("certificates.id", ondelete="CASCADE"),nullable=False)
    service_id = db.Column(db.Integer,db.ForeignKey("services.id"),nullable=False)
    service_count = db.Column(Numeric(10, 2), nullable=True)

    certificate = db.relationship(
        "Certificate",
        back_populates="certificate_services"
    )

    service = db.relationship("Services")
    
class CertificateTemplate(db.Model, TimestampMixin):
    """таблица для хранения пути до визуального макета сертификата. 
        к одному сертификату может быть несколько макетов (передняя/задняя сторона) 

    Args:
        db (_type_): _description_

    Returns:
        _type_: _description_
    """
    __tablename__ = "certificate_templates"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)           # понятное название
    certificate_id = db.Column(db.Integer,db.ForeignKey("certificates.id", ondelete="CASCADE"),nullable=False)
    folder_path = db.Column(db.String(500), nullable=False)   # абсолютный или относительный путь к папке
    filename = db.Column(db.String(200), nullable=False)      # имя файла с расширением
    sort_order = db.Column( db.Integer, default=0, nullable=False) # порядок сортировки
    #created_at = db.Column(db.DateTime, default=datetime.now) 
    user_id = db.Column( db.Integer, db.ForeignKey("users.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)

    certificate = db.relationship(
        "Certificate",
        back_populates="certificate_templates"
    )
    user = db.relationship( "User", foreign_keys=[user_id])
    
    @property
    def full_path(self):
        return (
            Path(current_app.config["CERTIFICATE_TEMPLATES_PATH"])
            / self.folder_path
            / self.filename
        )

    @property
    def exists(self):
        path = self.full_path
        return path.is_file()
    
    @property
    def extension(self):
        return self.full_path.suffix.lower()

    @property
    def is_image(self):
        return self.extension in {
            ".jpg",
            ".jpeg",
            ".png",
            ".webp"
        }
        
    @property
    def is_valid_path(self):
        base_path = Path(
            current_app.config[
                "CERTIFICATE_TEMPLATES_PATH"
            ]
        ).resolve()

        file_path = self.full_path.resolve()

        try:
            file_path.relative_to(base_path)
            return True
        except ValueError:
            return False
        
class AuditLog(db.Model, TimestampMixin):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)          # create, update, delete, spend, issue...
    entity_type = db.Column(db.String(100), nullable=False)    # 'Certificate'
    entity_id = db.Column(db.Integer, nullable=True)
    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True)
    
    old_data = db.Column(db.JSON, nullable=True)   # до изменений
    new_data = db.Column(db.JSON, nullable=True)   # после
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    comment = db.Column(db.Text, nullable=True)
    
    #created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)
    
    user = db.relationship('User', backref='audit_logs')
    place = db.relationship('Place')
    
class Template(db.Model, TimestampMixin):
    __tablename__ = "templates"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column( db.String(150), nullable=False)
    code = db.Column( db.String(100), nullable=False, unique=True)
    description = db.Column( db.Text, nullable=True)
    #created_at = db.Column( db.DateTime, nullable=False, default=datetime.now)
    #updated_at = db.Column( db.DateTime, nullable=False, default=datetime.now, onupdate=datetime.now)
    
    versions = db.relationship(
        "TemplateVersion",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateVersion.version"
    )
    
class TemplateVersion(db.Model, TimestampMixin):
    __tablename__ = "template_versions"

    id = db.Column( db.Integer, primary_key=True)
    template_id = db.Column( db.Integer, db.ForeignKey("templates.id"), nullable=False)
    version = db.Column( db.Integer, nullable=False)
    folder_path = db.Column( db.String(500), nullable=False)
    filename = db.Column( db.String(255), nullable=False)
    mime_type = db.Column( db.String(100), nullable=True)
    file_size = db.Column( db.Integer, nullable=True)
    is_active = db.Column( db.Boolean, nullable=False, default=True)
    #created_at = db.Column( db.DateTime, nullable=False, default=datetime.now)
    created_by = db.Column( db.Integer, db.ForeignKey("users.id"), nullable=True)
    
    template = db.relationship(
        "Template",
        back_populates="versions"
    )

    certificates = db.relationship(
        "Certificate",
        secondary="certificate_template_links",
        back_populates="template_versions"
        ,lazy="selectin"
        ,overlaps="template_links"
    )

    certificate_links = db.relationship(
        "CertificateTemplateLink",
        back_populates="template_version",
        cascade="all, delete-orphan",
        overlaps="certificates,template_versions"
    )

    creator = db.relationship(
        "User",
        foreign_keys=[created_by]
    )

    __table_args__ = (
        db.UniqueConstraint(
            "template_id",
            "version",
            name="uq_template_version"
        ),
    )
    
class CertificateTemplateLink(db.Model, TimestampMixin):
    __tablename__ = "certificate_template_links"
    __table_args__ = (
        db.UniqueConstraint(
            "certificate_id",
            "template_version_id",
            name="uq_certificate_template_version"
        ),
    )
    certificate_id = db.Column( db.Integer, db.ForeignKey("certificates.id"), primary_key=True)
    template_version_id = db.Column( db.Integer, db.ForeignKey("template_versions.id"), primary_key=True)

    certificate = db.relationship(
        "Certificate",
        back_populates="template_links"
        ,overlaps="certificates,template_versions"
        #overlaps="certificate_links,template_links"
    )

    template_version = db.relationship(
        "TemplateVersion",
        back_populates="certificate_links"
        ,overlaps="certificates,template_versions"
    )