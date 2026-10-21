import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    return psycopg2.connect(os.getenv("DATABASE_URL"))

def init_db():
    conn = get_connection()
    cur = conn.cursor()

    # Users table (new)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            SERIAL PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at    TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS decks (
            id          SERIAL PRIMARY KEY,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            name        TEXT NOT NULL,
            filename    TEXT,
            total_cards INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS cards (
            id             SERIAL PRIMARY KEY,
            deck_id        INTEGER NOT NULL REFERENCES decks(id),
            question       TEXT NOT NULL,
            answer         TEXT NOT NULL,
            card_type      TEXT DEFAULT 'concept',
            topic          TEXT,
            stability      REAL DEFAULT 0,
            difficulty     REAL DEFAULT 0,
            elapsed_days   INTEGER DEFAULT 0,
            scheduled_days INTEGER DEFAULT 0,
            reps           INTEGER DEFAULT 0,
            lapses         INTEGER DEFAULT 0,
            state          INTEGER DEFAULT 0,
            due_date       TIMESTAMP DEFAULT NOW(),
            last_review    TIMESTAMP,
            created_at     TIMESTAMP DEFAULT NOW()
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS review_logs (
            id             SERIAL PRIMARY KEY,
            card_id        INTEGER NOT NULL REFERENCES cards(id),
            rating         INTEGER NOT NULL,
            scheduled_days INTEGER,
            reviewed_at    TIMESTAMP DEFAULT NOW()
        )
    """)

    # Settings: key = "u{user_id}:{setting_name}"  e.g. "u42:notify_email"
    cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    conn.commit()
    cur.close()
    conn.close()
