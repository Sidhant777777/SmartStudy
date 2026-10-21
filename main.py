import os
import psycopg2
import psycopg2.extras
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from fsrs import Scheduler, Card, Rating, State
from datetime import datetime, timezone, date, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

from database import init_db, get_connection
from pdf_parser import extract_text, chunk_text
from card_generator import generate_cards

from apscheduler.schedulers.background import BackgroundScheduler
from notifier import send_all_notifications

load_dotenv()

app = FastAPI(title="SmartStudy API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Belt-and-suspenders: manually add CORS to every response
@app.middleware("http")
async def cors_middleware(request, call_next):
    if request.method == "OPTIONS":
        from starlette.responses import Response
        r = Response()
        r.headers["Access-Control-Allow-Origin"] = "*"
        r.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        r.headers["Access-Control-Allow-Headers"] = "*"
        return r
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

fsrs_scheduler = Scheduler()
RATING_MAP = {1: Rating.Again, 2: Rating.Hard, 3: Rating.Good, 4: Rating.Easy}

# ── AUTH CONFIG ─────────────────────────────────────────────────
SECRET_KEY    = os.getenv("JWT_SECRET", "dev-secret-CHANGE-in-production")
ALGORITHM     = "HS256"
TOKEN_DAYS    = 7
pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

def hash_password(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(pw: str, hashed: str) -> bool:
    return pwd_context.verify(pw, hashed)

def create_token(user_id: int) -> str:
    exp = datetime.utcnow() + timedelta(days=TOKEN_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired token — please log in again")

def skey(user_id: int, name: str) -> str:
    """Build a per-user settings key like 'u42:notify_email'"""
    return f"u{user_id}:{name}"

# Global scheduler
app_scheduler = None

@app.on_event("startup")
def on_startup():
    global app_scheduler
    init_db()
    print("✓ Database ready")
    app_scheduler = BackgroundScheduler()
    app_scheduler.add_job(send_all_notifications, trigger="cron", hour=8, minute=0, id="email_reminder")
    app_scheduler.start()
    print("✓ Email scheduler started (runs daily at 08:00)")


# ── HELPERS ──────────────────────────────────────────────────────

def _as_dt(v):
    if v is None: return None
    if isinstance(v, datetime): return v
    return datetime.fromisoformat(str(v))

def card_row_to_fsrs(row: dict) -> Card:
    card = Card()
    reps = int(row.get("reps", 0) or 0)
    if reps == 0: return card
    try:
        card.stability   = max(float(row["stability"] or 0.1), 0.1)
        card.difficulty  = float(row["difficulty"] or 5.0)
        card.state       = State(int(row["state"] or 1))
        card.last_review = _as_dt(row.get("last_review"))
        card.due         = _as_dt(row.get("due_date"))
    except Exception as e:
        print(f"[fsrs] Error: {e}")
        return Card()
    return card


# ── AUTH ENDPOINTS ────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email:    str
    password: str

@app.post("/register")
def register(body: AuthRequest):
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    email = body.email.strip().lower()
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    cur.execute(
        "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
        (email, hash_password(body.password))
    )
    user_id = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close()
    return {"token": create_token(user_id), "email": email}

@app.post("/login")
def login(body: AuthRequest):
    email = body.email.strip().lower()
    conn  = get_connection()
    cur   = conn.cursor()
    cur.execute("SELECT id, password_hash FROM users WHERE email = %s", (email,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row or not verify_password(body.password, row[1]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"token": create_token(row[0]), "email": email}


# ── DECK ENDPOINTS ────────────────────────────────────────────────

@app.post("/decks/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: int = Depends(get_current_user)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    file_bytes = await file.read()
    text = extract_text(file_bytes)
    if len(text.strip()) < 100:
        raise HTTPException(status_code=400, detail="Could not extract enough text from this PDF")
    chunks    = chunk_text(text)[:10]
    all_cards = []
    for i, chunk in enumerate(chunks):
        print(f"Generating cards for chunk {i+1}/{len(chunks)}...")
        all_cards.extend(generate_cards(chunk))
    if not all_cards:
        raise HTTPException(status_code=500, detail="Failed to generate any flashcards")

    conn = get_connection()
    cur  = conn.cursor()
    deck_name = file.filename.replace(".pdf", "")
    cur.execute(
        "INSERT INTO decks (user_id, name, filename, total_cards) VALUES (%s, %s, %s, %s) RETURNING id",
        (user_id, deck_name, file.filename, len(all_cards))
    )
    deck_id = cur.fetchone()[0]
    for card in all_cards:
        cur.execute(
            "INSERT INTO cards (deck_id, question, answer, card_type, topic) VALUES (%s, %s, %s, %s, %s)",
            (deck_id, card.get("question",""), card.get("answer",""), card.get("card_type","concept"), card.get("topic","General"))
        )
    conn.commit(); cur.close(); conn.close()
    return {"deck_id": deck_id, "name": deck_name, "total_cards": len(all_cards), "message": f"Created {len(all_cards)} flashcards!"}

@app.get("/decks")
def get_all_decks(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM decks WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]

@app.get("/decks/{deck_id}/cards")
def get_deck_cards(deck_id: int, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM cards WHERE deck_id = %s AND deck_id IN (SELECT id FROM decks WHERE user_id = %s)", (deck_id, user_id))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]

@app.delete("/decks/{deck_id}")
def delete_deck(deck_id: int, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT id FROM decks WHERE id = %s AND user_id = %s", (deck_id, user_id))
    if not cur.fetchone():
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Deck not found")
    cur.execute("DELETE FROM review_logs WHERE card_id IN (SELECT id FROM cards WHERE deck_id = %s)", (deck_id,))
    cur.execute("DELETE FROM cards WHERE deck_id = %s", (deck_id,))
    cur.execute("DELETE FROM decks WHERE id = %s", (deck_id,))
    conn.commit(); cur.close(); conn.close()
    return {"message": f"Deck {deck_id} deleted"}


# ── CARD ENDPOINTS ────────────────────────────────────────────────

@app.get("/cards/due")
def get_due_cards(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT cards.*, decks.name AS deck_name
        FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE due_date::date <= CURRENT_DATE
          AND decks.user_id = %s
        ORDER BY due_date ASC
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]

class ReviewRequest(BaseModel):
    rating: int

@app.post("/cards/{card_id}/review")
def review_card(card_id: int, body: ReviewRequest, user_id: int = Depends(get_current_user)):
    if body.rating not in RATING_MAP:
        raise HTTPException(status_code=400, detail="Rating must be 1-4")
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT cards.* FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE cards.id = %s AND decks.user_id = %s
    """, (card_id, user_id))
    row = cur.fetchone()
    if not row:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="Card not found")
    fsrs_card = card_row_to_fsrs(dict(row))
    updated_card, _ = fsrs_scheduler.review_card(fsrs_card, RATING_MAP[body.rating])
    scheduled_days = 0
    if updated_card.due and updated_card.last_review:
        scheduled_days = max((updated_card.due - updated_card.last_review).days, 0)
    cur.execute("""
        UPDATE cards SET
            stability = %s, difficulty = %s, state = %s,
            due_date = %s, last_review = %s, scheduled_days = %s,
            reps = reps + 1, lapses = lapses + %s
        WHERE id = %s
    """, (updated_card.stability, updated_card.difficulty, updated_card.state.value,
          updated_card.due, updated_card.last_review, scheduled_days,
          1 if body.rating == 1 else 0, card_id))
    cur.execute("INSERT INTO review_logs (card_id, rating, scheduled_days) VALUES (%s, %s, %s)",
                (card_id, body.rating, scheduled_days))
    conn.commit(); cur.close(); conn.close()
    return {"next_due_date": updated_card.due.isoformat(), "scheduled_days": scheduled_days,
            "message": f"Next review in {scheduled_days} days"}


# ── STATS ENDPOINTS ───────────────────────────────────────────────

@app.get("/stats")
def get_stats(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT COUNT(*) FROM cards JOIN decks ON cards.deck_id = decks.id WHERE decks.user_id = %s", (user_id,))
    total_cards = cur.fetchone()["count"]
    cur.execute("SELECT COUNT(*) FROM cards JOIN decks ON cards.deck_id = decks.id WHERE due_date::date <= CURRENT_DATE AND decks.user_id = %s", (user_id,))
    due_today = cur.fetchone()["count"]
    cur.execute("SELECT COUNT(*) FROM cards JOIN decks ON cards.deck_id = decks.id WHERE reps >= 3 AND state = 2 AND decks.user_id = %s", (user_id,))
    mastered = cur.fetchone()["count"]
    cur.execute("""
        SELECT topic, COUNT(*) as card_count FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE decks.user_id = %s
        GROUP BY topic ORDER BY card_count DESC LIMIT 5
    """, (user_id,))
    topic_rows = cur.fetchall(); cur.close(); conn.close()
    retention_rate = round((mastered / total_cards * 100), 1) if total_cards > 0 else 0.0
    return {"total_cards": total_cards, "due_today": due_today, "mastered": mastered,
            "retention_rate": retention_rate, "top_topics": [dict(r) for r in topic_rows]}

@app.get("/stats/streak")
def get_streak(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        SELECT DISTINCT reviewed_at::date AS study_date
        FROM review_logs
        JOIN cards ON review_logs.card_id = cards.id
        JOIN decks ON cards.deck_id = decks.id
        WHERE decks.user_id = %s AND reviewed_at >= NOW() - INTERVAL '365 days'
        ORDER BY study_date DESC
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    if not rows: return {"streak": 0}
    date_set = {r[0] for r in rows}
    today = date.today()
    start = today if today in date_set else today - timedelta(days=1)
    streak, check = 0, start
    while check in date_set:
        streak += 1; check -= timedelta(days=1)
    return {"streak": streak}

@app.get("/stats/heatmap")
def get_heatmap(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT reviewed_at::date AS date, COUNT(*) AS count
        FROM review_logs
        JOIN cards ON review_logs.card_id = cards.id
        JOIN decks ON cards.deck_id = decks.id
        WHERE decks.user_id = %s AND reviewed_at >= NOW() - INTERVAL '6 months'
        GROUP BY date ORDER BY date
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [{"date": str(r["date"]), "count": r["count"]} for r in rows]

@app.get("/stats/forecast")
def get_forecast(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT due_date::date AS date, COUNT(*) AS count
        FROM cards JOIN decks ON cards.deck_id = decks.id
        WHERE due_date::date > CURRENT_DATE
          AND due_date::date <= CURRENT_DATE + INTERVAL '14 days'
          AND decks.user_id = %s
        GROUP BY date ORDER BY date
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [{"date": str(r["date"]), "count": r["count"]} for r in rows]

@app.get("/stats/topics")
def get_topic_accuracy(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT topic, SUM(reps) AS total_reps, SUM(lapses) AS total_lapses,
               COUNT(*) AS card_count,
               ROUND((SUM(reps)-SUM(lapses))::numeric/NULLIF(SUM(reps),0)*100,1) AS accuracy
        FROM cards JOIN decks ON cards.deck_id = decks.id
        WHERE reps > 0 AND decks.user_id = %s
        GROUP BY topic ORDER BY accuracy ASC LIMIT 10
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]


# ── SETTINGS ENDPOINTS ────────────────────────────────────────────

class EmailSettings(BaseModel):
    email: str

@app.get("/settings/email")
def get_notify_email(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = %s", (skey(user_id, "notify_email"),))
    row = cur.fetchone(); cur.close(); conn.close()
    return {"email": row[0] if row else ""}

@app.post("/settings/email")
def save_notify_email(body: EmailSettings, user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO settings (key, value) VALUES (%s, %s)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    """, (skey(user_id, "notify_email"), body.email))
    conn.commit(); cur.close(); conn.close()
    return {"message": "Email saved"}

class ReminderTimeSettings(BaseModel):
    time: str

@app.get("/settings/reminder-time")
def get_reminder_time(user_id: int = Depends(get_current_user)):
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("SELECT value FROM settings WHERE key = %s", (skey(user_id, "reminder_time"),))
    row = cur.fetchone(); cur.close(); conn.close()
    return {"time": row[0] if row else "08:00"}

@app.post("/settings/reminder-time")
def save_reminder_time(body: ReminderTimeSettings, user_id: int = Depends(get_current_user)):
    try:
        hour, minute = map(int, body.time.split(":"))
        if not (0 <= hour <= 23 and 0 <= minute <= 59): raise ValueError
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Time must be HH:MM")
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO settings (key, value) VALUES (%s, %s)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    """, (skey(user_id, "reminder_time"), body.time))
    conn.commit(); cur.close(); conn.close()
    return {"message": f"Reminder time set to {body.time}"}


# ── MISC ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/test-email")
def test_email():
    from notifier import send_all_notifications
    send_all_notifications()
    return {"message": "Email function triggered"}
