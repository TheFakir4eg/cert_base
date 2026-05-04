"""convert certificate amounts to numeric

Revision ID: 43236af7c706
Revises: 74913b13fbc8
Create Date: 2026-04-24 15:40:49.509982

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '43236af7c706'
down_revision = '74913b13fbc8'
branch_labels = None
depends_on = None


def upgrade():
    # 1. создаём таблицу списаний сертификата
    op.create_table(
        'certificate_usages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('certificate_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Numeric(10, 2), nullable=False),
        sa.Column('comment', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['certificate_id'], ['certificates.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )

    # 2. добавляем временные numeric колонки
    op.add_column('certificates', sa.Column('total_amount_tmp', sa.Numeric(10,2), nullable=True))
    op.add_column('certificates', sa.Column('expired_amount_tmp', sa.Numeric(10,2), nullable=True))

    # 3. переносим данные с конвертацией
    op.execute("""
        UPDATE certificates
        SET 
            total_amount_tmp = CAST(total_amount AS DECIMAL(10,2)),
            expired_amount_tmp = CAST(expired_amount AS DECIMAL(10,2))
    """)

    # 4. удаляем старые varchar колонки
    op.drop_column('certificates', 'total_amount')
    op.drop_column('certificates', 'expired_amount')

    # 5. переименовываем новые
    op.alter_column('certificates', 'total_amount_tmp', new_column_name='total_amount', existing_type=sa.Numeric(10,2), nullable=False)
    op.alter_column('certificates', 'expired_amount_tmp', new_column_name='expired_amount', existing_type=sa.Numeric(10,2), nullable=False)


def downgrade():
    # 1. временные varchar
    op.add_column('certificates', sa.Column('total_amount_tmp', sa.String(20), nullable=True))
    op.add_column('certificates', sa.Column('expired_amount_tmp', sa.String(20), nullable=True))

    # 2. перенос обратно
    op.execute("""
        UPDATE certificates
        SET 
            total_amount_tmp = CAST(total_amount AS CHAR),
            expired_amount_tmp = CAST(expired_amount AS CHAR)
    """)

    # 3. удаляем numeric
    op.drop_column('certificates', 'total_amount')
    op.drop_column('certificates', 'expired_amount')

    # 4. переименование
    op.alter_column('certificates', 'total_amount_tmp', new_column_name='total_amount', existing_type=sa.String(20), nullable=False)
    op.alter_column('certificates', 'expired_amount_tmp', new_column_name='expired_amount', existing_type=sa.String(20), nullable=False)

    # 5. удаляем таблицу списаний
    op.drop_table('certificate_usages')
