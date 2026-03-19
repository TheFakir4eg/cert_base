# app/models.py
from app import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin

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
    create_date = db.Column(db.DateTime, default=lambda: datetime.now())
    expired_amount = db.Column(db.String(20), nullable=False) # остаток сертификата, изначально равен номиналу
    note = db.Column(db.String(100), nullable=True)
    
    # Отношение к User 
    user = db.relationship('User', backref='certificates')
    
    # Отношение к ServiceGroup 
    servicegroup = db.relationship('ServiceGroup', backref='certificates')
    
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

    # метод для проверки прав группы
    """def has_permission(self, resource_name, permission_type='can_view'):
        #Проверяет, есть ли у группы разрешение на ресурс
        resource = Resource.query.filter_by(name=resource_name).first()
        if not resource:
            return False
        
        permission = Permission.query.filter_by(
            group_id=self.id,
            resource_id=resource.id
        ).first()
        
        if permission:
            return getattr(permission, permission_type, False)
        
        return False"""
    
    def __repr__(self):
        return f'<Group {self.text}>'



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
    
class Resource(db.Model):
    """таблица ресурсов (страницы, функциональные блоки)
    """
    __tablename__ = 'resources'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)  # уникальное имя ресурса
    description = db.Column(db.String(200), nullable=True)
    route = db.Column(db.String(100), nullable=True)  # связанный маршрут (опционально)
    
    def __repr__(self):
        return f'<Resource {self.name}>'
    
class Permission(db.Model):
    """таблица разрешений для групп на ресурсы
    """
    __tablename__ = 'permissions'
    id = db.Column(db.Integer, primary_key=True)
    group_id = db.Column(db.Integer, db.ForeignKey('groups.id'), nullable=False)
    resource_id = db.Column(db.Integer, db.ForeignKey('resources.id'), nullable=True)
    
    # Права доступа
    can_view = db.Column(db.Boolean, default=False, nullable=False)
    can_add = db.Column(db.Boolean, default=False, nullable=False)
    can_edit = db.Column(db.Boolean, default=False, nullable=False)
    can_delete = db.Column(db.Boolean, default=False, nullable=False)
    
    # Отношения
    group = db.relationship('Group', backref='permissions')
    resource = db.relationship('Resource', backref='permissions')
    
    __table_args__ = (db.UniqueConstraint('group_id', 'resource_id', name='unique_group_resource'),)
    
    def __repr__(self):
        return f'<Permission {self.group_id}:{self.resource_id}>'
    
class ServiceGroup(db.Model):
    """ Группы услуг

    Args:
        db (_type_): _description_
    """
    __tablename__ = 'servicegroup'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(100), nullable=True)