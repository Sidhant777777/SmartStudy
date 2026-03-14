# ================================================================
# main.py
# ================================================================
# This is the HEART of our backend — the FastAPI application.
#
# What is FastAPI?
# ----------------
# FastAPI is a Python library that turns your Python functions
# into API endpoints — URLs that the frontend (React) can call.
#
# Example: When React wants to get all due cards, it sends a
# request to http://localhost:8000/cards/due
# FastAPI receives that request and runs our get_due_cards() function.
#
# What is an endpoint?
# --------------------
# An endpoint is just a URL that does something specific:
#   GET  /decks          → returns a list of all decks
#   POST /decks/upload   → receives a PDF, generates cards, saves them
#   GET  /cards/due      → returns cards due for review today
#   POST /cards/3/review → records that card #3 was reviewed
#   GET  /stats          → returns dashboard statistics
#
# GET  = we're READING data (no body needed)
# POST = we're SENDING data (file, rating, etc.)
#
# How to run this:
#   uvicorn main:app --reload
#   Then open http://localhost:8000/docs to test all endpoints!
# ================================================================

import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timezone

from database import init_db, get_connection
from pdf_parser import extract_text, chunk_text
from card_generator import generate_cards

from apscheduler.schedulers.background import BackgroundScheduler
from notifier import send_notification_email

# ── SETUP ──────────────────────────────────────────────────────

load_dotenv()

app = FastAPI(title="FlashCard AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

fsrs_scheduler = Scheduler()

RATING_MAP = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
}


# ── STARTUP ────────────────────────────────────────────────────

@app.on_event("startup")
def on_startup():
    init_db()
    print("✓ Database ready")

    # Start the email scheduler
    # BackgroundScheduler runs in a background thread
    # so it doesn't block the API from handling requests
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        send_notification_email,  # function to call
        trigger="cron",           # run on a schedule
        hour=8,                   # at 8 AM
        minute=0
    )
    scheduler.start()
    print("✓ Email scheduler started (runs daily at 8 AM)")

# ================================================================
# HELPER FUNCTION
# ================================================================

def card_row_to_fsrs(row: dict) -> Card:
    """
    Converts a database row into an FSRS Card object.

    This version of fsrs uses these attributes on Card:
        card_id, state, step, stability, difficulty, due, last_review

    It does NOT have: elapsed_days, scheduled_days, reps, lapses
    We track those ourselves in the database.
    """
    card = Card()
    reps = int(row.get("reps", 0) or 0)

    # New cards (never reviewed) → return a fresh Card
    # FSRS handles new cards differently internally
    if reps == 0:
        return card

    try:
        # Restore memory state for previously reviewed cards
        card.stability  = max(float(row["stability"] or 0.1), 0.1)
        card.difficulty = float(row["difficulty"] or 5.0)
        card.state      = State(int(row["state"] or 1))

        if row.get("last_review"):
            card.last_review = datetime.fromisoformat(row["last_review"])
        if row.get("due_date"):
            card.due = datetime.fromisoformat(row["due_date"])

    except Exception as e:
        print(f"[fsrs] Error rebuilding card: {e}")
        return Card()

    return card


# ================================================================
# ENDPOINT 1: Upload PDF and generate flashcards
# ================================================================

@app.post("/decks/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """
    What happens when you POST to /decks/upload:
    1. Receive the PDF file
    2. Extract all text from it
    3. Split the text into chunks
    4. Send each chunk to Groq AI → get flashcards back
    5. Save the deck + all cards to the database
    6. Return how many cards were created
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    file_bytes = await file.read()
    text = extract_text(file_bytes)

    if len(text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this PDF")

    chunks = chunk_text(text)[:10]  # max 10 chunks → ~50 cards

    all_cards = []
    for i, chunk in enumerate(chunks):
        print(f"Generating cards for chunk {i+1}/{len(chunks)}...")
        cards = generate_cards(chunk)
        all_cards.extend(cards)

    if not all_cards:
        raise HTTPException(status_code=500, detail="Failed to generate any flashcards from this PDF")

    conn = get_connection()
    c = conn.cursor()

    deck_name = file.filename.replace(".pdf", "")
    c.execute(
        "INSERT INTO decks (name, filename, total_cards) VALUES (?, ?, ?)",
        (deck_name, file.filename, len(all_cards))
    )
    deck_id = c.lastrowid

    for card in all_cards:
        c.execute("""
            INSERT INTO cards (deck_id, question, answer, card_type, topic)
            VALUES (?, ?, ?, ?, ?)
        """, (
            deck_id,
            card.get("question", ""),
            card.get("answer", ""),
            card.get("card_type", "concept"),
            card.get("topic", "General")
        ))

    conn.commit()
    conn.close()

    return {
        "deck_id": deck_id,
        "name": deck_name,
        "total_cards": len(all_cards),
        "message": f"Successfully generated {len(all_cards)} flashcards!"
    }


# ================================================================
# ENDPOINT 2: Get all decks
# ================================================================

@app.get("/decks")
def get_all_decks():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM decks ORDER BY created_at DESC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ================================================================
# ENDPOINT 3: Get all cards in a deck
# ================================================================

@app.get("/decks/{deck_id}/cards")
def get_deck_cards(deck_id: int):
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM cards WHERE deck_id = ?", (deck_id,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ================================================================
# ENDPOINT 4: Get cards due today
# ================================================================

@app.get("/cards/due")
def get_due_cards():
    """
    Returns all cards where due_date is today or in the past.
    These are the cards shown in the review session.
    """
    conn = get_connection()
    rows = conn.execute("""
        SELECT cards.*, decks.name as deck_name
        FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE date(due_date) <= date('now')
        ORDER BY due_date ASC
    """).fetchall()
    conn.close()
    return [dict(row) for row in rows]


# ================================================================
# ENDPOINT 5: Submit a review rating for a card
# ================================================================

class ReviewRequest(BaseModel):
    rating: int  # 1=Again, 2=Hard, 3=Good, 4=Easy


@app.post("/cards/{card_id}/review")
def review_card(card_id: int, body: ReviewRequest):
    """
    What happens here:
    1. Load the card from database
    2. Rebuild its FSRS Card object
    3. Run FSRS algorithm → get updated stability, difficulty, due date
    4. Save updated values back to database
    5. Return next due date

    NOTE: This version of fsrs tracks:
        card_id, state, step, stability, difficulty, due, last_review
    We track reps and lapses ourselves in the database.
    """
    if body.rating not in RATING_MAP:
        raise HTTPException(status_code=400, detail="Rating must be 1-4")

    conn = get_connection()

    row = conn.execute(
        "SELECT * FROM cards WHERE id = ?", (card_id,)
    ).fetchone()

    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail=f"Card {card_id} not found")

    card_data = dict(row)

    # Rebuild FSRS Card from stored values
    fsrs_card = card_row_to_fsrs(card_data)

    # Run FSRS algorithm
    # updated_card now has: stability, difficulty, state, due, last_review
    updated_card, review_log = fsrs_scheduler.review_card(
        fsrs_card,
        RATING_MAP[body.rating]
    )

    # Calculate how many days until next review
    # due and last_review are both datetimes → subtract to get timedelta
    scheduled_days = 0
    if updated_card.due and updated_card.last_review:
        diff = updated_card.due - updated_card.last_review
        scheduled_days = max(diff.days, 0)

    # Save updated FSRS values back to database
    # reps and lapses we track ourselves (not on the Card object)
    conn.execute("""
        UPDATE cards SET
            stability      = ?,
            difficulty     = ?,
            state          = ?,
            due_date       = ?,
            last_review    = ?,
            scheduled_days = ?,
            reps           = reps + 1,
            lapses         = lapses + ?
        WHERE id = ?
    """, (
        updated_card.stability,
        updated_card.difficulty,
        updated_card.state.value,           # convert State enum → int
        updated_card.due.isoformat(),       # datetime → string for SQLite
        updated_card.last_review.isoformat() if updated_card.last_review else None,
        scheduled_days,
        1 if body.rating == 1 else 0,       # only count lapses on "Again"
        card_id
    ))

    conn.execute(
        "INSERT INTO review_logs (card_id, rating, scheduled_days) VALUES (?, ?, ?)",
        (card_id, body.rating, scheduled_days)
    )

    conn.commit()
    conn.close()

    return {
        "next_due_date": updated_card.due.isoformat(),
        "scheduled_days": scheduled_days,
        "message": f"Next review in {scheduled_days} days"
    }


# ================================================================
# ENDPOINT 6: Dashboard statistics
# ================================================================

@app.get("/stats")
def get_stats():
    """
    Returns numbers for the analytics dashboard:
    - Total cards
    - Due today
    - Mastered (reviewed 3+ times and in Review state)
    - Retention rate
    - Top topics
    """
    conn = get_connection()

    total_cards = conn.execute("SELECT COUNT(*) FROM cards").fetchone()[0]

    due_today = conn.execute(
        "SELECT COUNT(*) FROM cards WHERE date(due_date) <= date('now')"
    ).fetchone()[0]

    # state=2 means "Review" in FSRS — the card is considered stable/mastered
    mastered = conn.execute(
        "SELECT COUNT(*) FROM cards WHERE reps >= 3 AND state = 2"
    ).fetchone()[0]

    topic_rows = conn.execute("""
        SELECT topic, COUNT(*) as card_count
        FROM cards
        GROUP BY topic
        ORDER BY card_count DESC
        LIMIT 5
    """).fetchall()

    conn.close()

    retention_rate = round((mastered / total_cards * 100), 1) if total_cards > 0 else 0.0

    return {
        "total_cards": total_cards,
        "due_today": due_today,
        "mastered": mastered,
        "retention_rate": retention_rate,
        "top_topics": [dict(row) for row in topic_rows]
    }

@app.get("/test-email")
def test_email():
    """Call this to test email without waiting for 8 AM"""
    send_notification_email()
    return {"message": "Email function triggered — check your inbox"}