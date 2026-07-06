"""add spend_client to certificateusage

Revision ID: 621cd52e1ef2
Revises: 4695dac2db96
Create Date: 2026-07-06 13:05:50.291454

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '621cd52e1ef2'
down_revision = '4695dac2db96'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("certificate_usages") as batch_op:
        batch_op.add_column(
            sa.Column("client_id", sa.Integer(), nullable=True)
        )

        batch_op.create_foreign_key(
            "fk_certificate_usages_client",      # <-- имя
            "clients",
            ["client_id"],
            ["id"],
            ondelete="CASCADE"
        )


def downgrade():
    with op.batch_alter_table("certificate_usages") as batch_op:
        batch_op.drop_constraint(
            "fk_certificate_usages_client",      # <-- то же имя
            type_="foreignkey"
        )

        batch_op.drop_column("client_id")
