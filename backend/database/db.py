"""
KrishiMitra AI — SQLite connection helper.

Resolves the database path relative to this file's own location, not the
current working directory, so Flask can be started from any directory without
losing the database.

Usage:
    from database.db import get_connection, get_db_path
"""
import sqlite3
from pathlib import Path

# Resolved relative to this file — works regardless of working directory.
_DB_PATH = Path(__file__).resolve().parent / "krishimitra.db"


def get_db_path() -> Path:
    """Return the absolute path to the SQLite database file."""
    return _DB_PATH


def get_connection() -> sqlite3.Connection:
    """Open and return a new SQLite connection with row_factory set to
    sqlite3.Row so columns are accessible by name.

    Caller is responsible for closing the connection (use as a context manager
    or call conn.close() explicitly).
    """
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
