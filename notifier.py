# ================================================================
# notifier.py
# ================================================================
# This file handles sending email notifications.
#
# What it does:
# Every day at 8 AM, it checks the database for cards that are due.
# If there are cards due, it sends an email saying "You have X cards
# to review today."
#
# How email sending works in Python:
# -----------------------------------
# Python has a built-in library called smtplib.
# SMTP = Simple Mail Transfer Protocol — the standard for sending email.
# We connect to Gmail's SMTP server, log in, and send the email.
# No external service needed — just a Gmail account.
#
# Gmail App Password:
# -------------------
# Gmail won't let you use your real password in code.
# Instead you create an "App Password" — a special 16-character
# password just for this app.
# How to get one:
#   1. Go to myaccount.google.com
#   2. Security → 2-Step Verification (must be ON)
#   3. Search "App passwords" → create one → copy the 16-char code
#   4. Put it in your .env as GMAIL_APP_PASSWORD
# ================================================================

import smtplib                          # built into Python, no pip needed
import os
from email.mime.text import MIMEText    # for creating email content
from email.mime.multipart import MIMEMultipart  # for email with subject + body
from database import get_connection


def get_due_count() -> int:
    """
    Checks the database and returns how many cards are due today.
    Returns 0 if none are due.
    """
    conn = get_connection()
    count = conn.execute(
        "SELECT COUNT(*) FROM cards WHERE date(due_date) <= date('now')"
    ).fetchone()[0]
    conn.close()
    return count


def get_due_by_topic() -> list:
    """
    Returns a breakdown of due cards by topic.
    Used to make the email more informative.
    Example: [{"topic": "Neural Networks", "count": 5}, ...]
    """
    conn = get_connection()
    rows = conn.execute("""
        SELECT topic, COUNT(*) as count
        FROM cards
        WHERE date(due_date) <= date('now')
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 5
    """).fetchall()
    conn.close()
    return [dict(row) for row in rows]


def send_notification_email():
    """
    The main function called by APScheduler every day at 8 AM.

    Steps:
    1. Check how many cards are due
    2. If 0 cards → skip (no need to email)
    3. If cards are due → build email and send via Gmail SMTP
    """

    # ── Read credentials from .env ─────────────────────────────
    sender_email   = os.getenv("GMAIL_ADDRESS")
    app_password   = os.getenv("GMAIL_APP_PASSWORD")
    receiver_email = os.getenv("NOTIFY_EMAIL")  # who to send the notification to

    # If email credentials aren't set up, skip silently
    if not all([sender_email, app_password, receiver_email]):
        print("[notifier] Email credentials not set up — skipping notification")
        return

    # ── Check how many cards are due ───────────────────────────
    due_count = get_due_count()

    if due_count == 0:
        print("[notifier] No cards due today — skipping email")
        return

    # ── Get topic breakdown ────────────────────────────────────
    topics = get_due_by_topic()

    # ── Build the email ────────────────────────────────────────
    # MIMEMultipart lets us have both a subject and a body
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📚 FlashCard AI — {due_count} cards due today"
    msg["From"]    = sender_email
    msg["To"]      = receiver_email

    # Build topic breakdown text
    topic_lines = "\n".join(
        f"  • {t['topic']}: {t['count']} cards" for t in topics
    )

    # Plain text version of the email
    text_body = f"""
Hi!

You have {due_count} flashcards due for review today.

Topics:
{topic_lines}

Open your FlashCard AI app to start reviewing.

Happy studying! 🧠
    """.strip()

    # Attach the text body to the email
    msg.attach(MIMEText(text_body, "plain"))

    # ── Send the email via Gmail SMTP ──────────────────────────
    try:
        # port 587 = Gmail's TLS port (standard for secure email)
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()        # introduce ourselves to the server
            server.starttls()    # upgrade connection to encrypted TLS
            server.login(sender_email, app_password)  # log in with App Password
            server.sendmail(sender_email, receiver_email, msg.as_string())

        print(f"[notifier] ✓ Email sent — {due_count} cards due today")

    except Exception as e:
        print(f"[notifier] ✗ Failed to send email: {e}")
