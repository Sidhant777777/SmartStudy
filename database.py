# ================================================================
# database.py
# ================================================================
# This file handles EVERYTHING related to our database.
#
# What is a database? It's just a place to store data permanently.
# Even if you close the app, the data stays saved.
#
# We're using SQLite — the simplest database that exists.
# It stores everything in a single file called "flashcards.db"
# No installation, no server, no setup. It's built into Python!
#
# This file does 2 things:
#   1. get_connection() → opens the database so we can talk to it
#   2. init_db()        → creates our tables the first time we run
# ================================================================

import sqlite3  # already installed with Python, no pip needed


# The database will be saved as this file in our project folder.
# SQLite creates it automatically on first run.
DB_PATH = "flashcards.db"


def get_connection():
    """
    Opens a connection to the database.
    
    Think of this like opening a book:
    - You open it (connect)
    - Read or write something
    - Close it when done
    
    We always call this at the start of any database operation,
    and always call conn.close() when we're done.

    What is row_factory = sqlite3.Row?
    -----------------------------------
    Normally, SQLite returns data as plain tuples:
        (1, "What is gradient descent?", "An optimization algorithm...")
    
    That's hard to work with. With row_factory = sqlite3.Row,
    we get dict-like objects instead:
        {"id": 1, "question": "What is gradient descent?", "answer": "..."}
    
    Now we can access data by name: row["question"] instead of row[0]
    Much more readable!
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """
    Creates our 3 database tables when the app first starts.
    
    What is a table?
    ----------------
    A table is like an Excel spreadsheet — it has rows and columns.
    Each row is one piece of data (one card, one deck, one review).
    Each column is a field (question, answer, due_date, etc.)

    IF NOT EXISTS means: only create if it doesn't already exist.
    So running this function 100 times is safe — it won't delete your data.

    Our 3 tables:
    ─────────────
    decks       → one row per PDF uploaded ("Machine Learning Notes")
    cards       → one row per flashcard, with FSRS scheduling data
    review_logs → one row every time a user reviews a card
    """
    conn = get_connection()

    # executescript lets us run multiple SQL commands at once
    conn.executescript("""

        -- ── TABLE 1: decks ────────────────────────────────────────
        -- Stores each uploaded PDF as a "deck" of flashcards
        -- Example row: (1, "ML Notes", "ml_notes.pdf", 42, "2026-09-07")
        CREATE TABLE IF NOT EXISTS decks (
            id          INTEGER PRIMARY KEY AUTOINCREMENT, -- unique ID, auto-increments (1, 2, 3...)
            name        TEXT    NOT NULL,                  -- deck name shown in the UI
            filename    TEXT,                              -- original PDF filename
            total_cards INTEGER DEFAULT 0,                 -- how many cards were generated from this PDF
            created_at  TEXT    DEFAULT (datetime('now'))  -- timestamp when deck was created
        );


        -- ── TABLE 2: cards ────────────────────────────────────────
        -- Stores every individual flashcard.
        -- Also stores the FSRS memory state for each card.
        --
        -- What is FSRS? It's the algorithm that decides WHEN to
        -- show you a card again based on how well you remembered it.
        -- It tracks memory using 3 concepts:
        --   Stability  → how long the memory lasts before it fades
        --   Difficulty → how hard this card is for YOU specifically
        --   State      → is this card New, Learning, or Mastered?
        CREATE TABLE IF NOT EXISTS cards (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id  INTEGER NOT NULL,         -- which deck this card belongs to (links to decks.id)
            question TEXT    NOT NULL,         -- the front of the flashcard (the question)
            answer   TEXT    NOT NULL,         -- the back of the flashcard (the answer)
            card_type TEXT   DEFAULT 'concept', -- type: concept / comparison / application
            topic    TEXT,                     -- subject topic (e.g. "Neural Networks", "SQL Joins")

            -- ── FSRS Fields ──────────────────────────────────────
            -- These 7 numbers represent the state of the user's memory
            -- for this specific card. FSRS updates them after each review.
            stability      REAL    DEFAULT 0, -- higher = memory lasts longer = shown less often
            difficulty     REAL    DEFAULT 0, -- 0-10, higher = harder card for this user
            elapsed_days   INTEGER DEFAULT 0, -- days since the card was last reviewed
            scheduled_days INTEGER DEFAULT 0, -- how many days until next review
            reps           INTEGER DEFAULT 0, -- total times this card has been reviewed
            lapses         INTEGER DEFAULT 0, -- times the user forgot (clicked "Again")
            state          INTEGER DEFAULT 0, -- 0=New, 1=Learning, 2=Review, 3=Relearning

            -- ── Timing Fields ────────────────────────────────────
            due_date    TEXT DEFAULT (datetime('now')), -- when to show this card next
            last_review TEXT,                           -- when it was last reviewed (null if never)
            created_at  TEXT DEFAULT (datetime('now')),

            -- This links each card to its deck.
            -- If deck_id=3, this card belongs to the deck with id=3
            FOREIGN KEY (deck_id) REFERENCES decks(id)
        );


        -- ── TABLE 3: review_logs ──────────────────────────────────
        -- Records every single review a user does.
        -- This lets us build the analytics dashboard:
        --   "You reviewed 15 cards today"
        --   "Your retention rate is 84%"
        --   "You struggle most with Transformers topic"
        CREATE TABLE IF NOT EXISTS review_logs (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            card_id        INTEGER NOT NULL,    -- which card was reviewed
            rating         INTEGER NOT NULL,    -- what rating the user gave (1/2/3/4)
            scheduled_days INTEGER,             -- how many days until the card is due again
            reviewed_at    TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (card_id) REFERENCES cards(id)
        );

    """)

    conn.commit()  # IMPORTANT: saves all changes to disk
    conn.close()   # IMPORTANT: always close the connection when done
