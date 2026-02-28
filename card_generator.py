# ================================================================
# card_generator.py
# ================================================================
# This file sends text to an AI (via Groq API) and gets back
# a list of flashcards as structured JSON data.
#
# What is Groq?
# -------------
# Groq is a free AI API that gives you access to powerful LLMs
# (like Llama 3). Think of it like ChatGPT's API but free.
# Sign up at console.groq.com to get your API key.
#
# What is an API?
# ---------------
# An API is just a way to talk to another service over the internet.
# We send it text, it sends back flashcards. Like a vending machine:
# put in text → get out flashcards.
#
# What is JSON?
# -------------
# JSON is just a format for structured data. Like a Python dict:
#   {"question": "What is X?", "answer": "X is...", "topic": "ML"}
# We ask the AI to return data in this format so our code can
# easily read and store it in the database.
# ================================================================

import os           # to read environment variables (our API key)
import json         # to parse the JSON response from the AI
from groq import Groq       # Groq SDK: pip install groq
from dotenv import load_dotenv  # reads our .env file

# Load the .env file so os.getenv() can find our API key
# Without this, GROQ_API_KEY would be None
load_dotenv()

# Create a Groq client — this is what we use to make API calls
# It reads GROQ_API_KEY from the .env file automatically
client = Groq(api_key=os.getenv("GROQ_API_KEY"))


# ── THE PROMPT ──────────────────────────────────────────────────
# This is the instruction we send to the AI along with the text.
# Writing a good prompt is everything — it's what tells the AI
# exactly what format to return data in.
#
# Key parts of this prompt:
#   1. We tell the AI its ROLE ("You are an expert educator...")
#   2. We specify the card TYPES it should create
#   3. We give it RULES for quality control
#   4. We tell it to return ONLY JSON (no extra text)
#   5. We show it the EXACT JSON format we want
#
# {text} is a placeholder — we replace it with actual PDF content
# when we call the function below.
# ──────────────────────────────────────────────────────────────
PROMPT = """You are an expert educator creating high-quality flashcards from study notes.

Given the text below, generate flashcards. Create a mix of these types:
- "concept"     : tests understanding of a definition or idea
                  Example Q: "What is gradient descent?"
- "comparison"  : tests ability to differentiate two things  
                  Example Q: "How does Adam optimizer differ from SGD?"
- "application" : tests knowing WHEN or WHY to use something
                  Example Q: "When would you use dropout in a neural network?"

Quality rules — follow these strictly:
1. Each card tests ONE specific thing. Not two things at once.
2. Answers should be 2-3 sentences maximum. Concise and clear.
3. Questions should be specific, not vague ("What is machine learning?" is too broad)
4. Skip obvious or trivial facts
5. The "topic" field should be a short subject label (e.g. "Backpropagation", "SQL Joins")

IMPORTANT: Return ONLY a valid JSON array. No explanation, no markdown, no extra text.
Just the raw JSON array starting with [ and ending with ]

Format:
[
  {{"question": "...", "answer": "...", "card_type": "concept", "topic": "..."}},
  {{"question": "...", "answer": "...", "card_type": "comparison", "topic": "..."}},
  ...
]

Text to convert into flashcards:
{text}"""


def generate_cards(text: str) -> list[dict]:
    """
    Sends a chunk of text to the Groq AI and gets back flashcards.

    How it works step by step:
    --------------------------
    1. We take the PROMPT template and fill in the actual text
    2. We send it to Groq's API (like sending a message to ChatGPT)
    3. The AI responds with a JSON array of flashcard objects
    4. We parse that JSON into a Python list of dicts
    5. We return that list

    What does the return value look like?
    --------------------------------------
    [
        {
            "question": "What is backpropagation?",
            "answer": "Backpropagation is an algorithm for training neural networks...",
            "card_type": "concept",
            "topic": "Neural Networks"
        },
        {
            "question": "How does dropout prevent overfitting?",
            "answer": "Dropout randomly disables neurons during training...",
            "card_type": "application",
            "topic": "Regularization"
        }
    ]

    If anything goes wrong (API error, bad JSON), we return an empty list []
    so the rest of the app doesn't crash.
    """

    try:
        # Step 1: Fill in the prompt with the actual text
        filled_prompt = PROMPT.format(text=text)

        # Step 2: Send the request to Groq API
        # This is like sending a message in ChatGPT
        response = client.chat.completions.create(
            model="openai/gpt-oss-20b",  # the AI model to use (free on Groq)
            messages=[
                {
                    "role": "user",       # we are the "user" in this conversation
                    "content": filled_prompt  # this is our message to the AI
                }
            ],
            temperature=0.3,    # 0 = very consistent, 1 = very creative
                                # 0.3 keeps cards factual and consistent
            max_tokens=2000     # maximum length of the AI's response
        )

        # Step 3: Extract the text from the response
        # The response object has a nested structure:
        # response.choices[0].message.content → the actual text the AI wrote
        raw_text = response.choices[0].message.content.strip()

        # Step 4: Clean up the response
        # Sometimes the AI wraps JSON in markdown code fences like:
        # ```json
        # [{"question": ...}]
        # ```
        # We need to strip those out before parsing
        if "```" in raw_text:
            # Split on ``` and take the middle part
            parts = raw_text.split("```")
            raw_text = parts[1]
            # Remove "json" label if present at the start
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]

        # Step 5: Parse the JSON string into a Python list
        # json.loads() converts: '[{"question": "..."}]'  →  [{"question": "..."}]
        cards = json.loads(raw_text.strip())

        return cards

    except json.JSONDecodeError as e:
        # The AI returned something that wasn't valid JSON
        # This can happen occasionally — we just skip this chunk
        print(f"[card_generator] JSON parse error: {e}")
        return []

    except Exception as e:
        # Something else went wrong (network error, API limit, etc.)
        print(f"[card_generator] Unexpected error: {e}")
        return []
