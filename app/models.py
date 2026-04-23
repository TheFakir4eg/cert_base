# app/models.py
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app.utils.permission_registry import permission_exists
from sqlalchemy.orm import validates

class Certificate(db.Model): # Модель для таблицы certificates
    """Сертификаты
        Основная таблица БД

    Args:
        id: Идентификатор
        issue_date (db.Date): Дата выдачи сертификата
        reason (db.String(20)): Причина выдачи сертификата
        

    """
    __tablename__ = 'certificates'

    id = db.Column(db.Integer, primary_key=True)
    issue_date = db.Column(db.Date) # Дата выдачи сертификата
    reason = db.Column(db.String(20), nullable=True) # Причина выдачи сертификата
    series = db.Column(db.String(20), nullable=False) # серия сертификата 
    number = db.Column(db.String(20), nullable=False) # номер сертификата
    total_amount = db.Column(db.String(20), nullable=False) # номинал сертификата
    place_id = db.Column(db.Integer, db.ForeignKey('places.id'), nullable=True) # Внешний ключ, место выдачи сетрификата
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # Внешний ключ, пользователь, создавший сертификат
    servicegroup_id = db.Column(db.Integer, db.ForeignKey('servicegroup.id'), nullable=True) # Внешний ключ, группа услуг
    client_id = db.Column(db.Integer, db.ForeignKey('clients.id'), nullable=True) # Внешний ключ, держатель сертификата (клиент, которому его выдали)
    create_date = db.Column(db.DateTime, default=lambda: datetime.now())
    expired_amount = db.Column(db.String(20), nullable=False) # остаток сертификата, изначально равен номиналу
    note = db.Column(db.String(100), nullable=True)
    
    # Отношения между таблицами
    user = db.relationship('User', backref='certificates')    
    servicegroup = db.relationship('ServiceGroup', backref='certificates')
    clients = db.relationship('Client', backref='certificates')
    
    def __repr__(self):
        return f'<Certificate {self.number}>'
    
class User(db.Model, UserMixin): 
    """таблица пользователей

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String(50), nullable=False) # логин пользователя
    name = db.Column(db.String(50), nullable=False) # данные ФИО
    password_hash = db.Column(db.String(255)) # поле для хеша пароля
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=True) # Внешний ключ, группы прав пользователя
    note = db.Column(db.String(100), nullable=True)
    create_date = db.Column(db.DateTime, default=lambda: datetime.now())
    active = db.Column(db.Boolean, default=True, nullable=False) # статус активности учетной записи
    
    # Отношение "многие к одному": многие пользователи принадлежат одной группе
    # используем back_populates='users', которое ссылается на атрибут в Group
    user_group = db.relationship('Group', back_populates='users') 
    
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
    
class Group(db.Model): 
    """группы прав пользователей

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'groups'
    id = db.Column(db.Integer, primary_key=True)
    text = db.Column(db.String(50), nullable=False)
    note = db.Column(db.String(100), nullable=True)
    # --- Добавляем relationship для связи с Users ---
    # Отношение "один ко многим": одна группа может иметь много пользователей
    # Используем back_populates для двустороннего доступа
    users = db.relationship('User', back_populates='user_group', lazy=True) # Список пользователей в этой группе
    # В модели Users обратная ссылка: user_group = db.relationship('Groups', back_populates='users')

    permissions = db.relationship(
        "GroupPermission",
        backref="group",
        lazy=True
    )
    
    def __repr__(self):
        return f'<Group {self.text}>'

class GroupPermission(db.Model):
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


class Place(db.Model): # Модель для таблицы places
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
    note = db.Column(db.String(100), nullable=True)
    
    # Отношение "один ко многим": одно место может иметь много сертификатов
    # backref автоматически создает атрибут 'place' в модели Certificate,
    # позволяющий получить объект Place для конкретного Certificate
    certificates = db.relationship('Certificate', backref='place', lazy=True)

    def __repr__(self):
        return f'<Place {self.name}>'
    
# 14.04.2026 Полностью удалены таблицы Resourses, Permissions
    

            
class ServiceGroup(db.Model):
    """ Группы услуг

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'servicegroup'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(100), nullable=True)
    
class Client(db.Model):
    """Клиенты. Люди, которым выданы сетрификаты

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'clients'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(12), nullable=True)
    note = db.Column(db.String(100), nullable=True)