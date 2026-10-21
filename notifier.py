import smtplib
import os
import psycopg2
import psycopg2.extras
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from database import get_connection


def get_due_count_for_user(user_id: int) -> int:
    conn = get_connection()
    cur  = conn.cursor()
    cur.execute("""
        SELECT COUNT(*) FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE due_date::date <= CURRENT_DATE AND decks.user_id = %s
    """, (user_id,))
    count = cur.fetchone()[0]
    cur.close(); conn.close()
    return count


def get_due_topics_for_user(user_id: int) -> list:
    conn = get_connection()
    cur  = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT topic, COUNT(*) as count FROM cards
        JOIN decks ON cards.deck_id = decks.id
        WHERE due_date::date <= CURRENT_DATE AND decks.user_id = %s
        GROUP BY topic ORDER BY count DESC LIMIT 5
    """, (user_id,))
    rows = cur.fetchall(); cur.close(); conn.close()
    return [dict(r) for r in rows]


def send_email_to_user(user_id: int, receiver_email: str):
    """Send a reminder to one specific user."""
    sender_email = os.getenv("GMAIL_ADDRESS")
    app_password = os.getenv("GMAIL_APP_PASSWORD")

    if not all([sender_email, app_password, receiver_email]):
        print(f"[notifier] Skipping user {user_id} — credentials not set")
        return

    due_count = get_due_count_for_user(user_id)
    if due_count == 0:
        print(f"[notifier] User {user_id}: no cards due — skipping")
        return

    topics = get_due_topics_for_user(user_id)
    topic_lines = "\n".join(f"  • {t['topic']}: {t['count']} cards" for t in topics)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📚 SmartStudy — {due_count} cards due today"
    msg["From"]    = sender_email
    msg["To"]      = receiver_email

    body = f"""Hi!

You have {due_count} flashcards due for review today.

Topics:
{topic_lines}

Open your SmartStudy app to start reviewing.

Happy studying! 🧠""".strip()

    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(sender_email, app_password)
            server.sendmail(sender_email, receiver_email, msg.as_string())
        print(f"[notifier] ✓ Sent to {receiver_email} ({due_count} cards due)")
    except Exception as e:
        print(f"[notifier] ✗ Failed for {receiver_email}: {e}")


def send_all_notifications():
    """Called by APScheduler daily — loops through all users who set a notify_email."""
    try:
        conn = get_connection()
        cur  = conn.cursor()
        # Keys look like "u42:notify_email"
        cur.execute("SELECT key, value FROM settings WHERE key LIKE 'u%:notify_email'")
        rows = cur.fetchall(); cur.close(); conn.close()
    except Exception as e:
        print(f"[notifier] DB error: {e}")
        return

    if not rows:
        print("[notifier] No users have set a notify_email — skipping")
        return

    for key, email in rows:
        try:
            user_id = int(key.split(":")[0][1:])  # "u42:notify_email" → 42
            send_email_to_user(user_id, email)
        except Exception as e:
            print(f"[notifier] Error processing {key}: {e}")
