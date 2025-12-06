# migrations/env.py
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# MODELS IMPORT
from models import Base  # УМУМИЙ Base шу ердан олган маъқул
import models  # barcha model fayllar import bo‘lsin deb

# Alembic Config
config = context.config

# Logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# DB URL: xohlasang settings.DATABASE_URL ishlat
# from core.config import settings
# config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

config.set_main_option(
    "sqlalchemy.url",
    "postgresql://postgres:postgres@localhost:5432/wb_cards"
)

# 👈 MUHIM: shu joyda metadata'ni aniqlab beramiz
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,  # bu yerda ham ishlatiladi
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,  # bu yerda ham
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
