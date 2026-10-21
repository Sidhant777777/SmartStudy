# ================================================================
# card_generator.py
# ================================================================
import os
import json
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PROMPT = """You are an expert educator creating high-quality flashcards from study notes.

Given the text below, generate flashcards. Create a mix of these types:
- "concept"     : tests understanding of a definition or idea
- "comparison"  : tests ability to differentiate two things
- "application" : tests knowing WHEN or WHY to use something

Quality rules:
1. Each card tests ONE specific thing.
2. Answers should be 2-3 sentences maximum.
3. Questions should be specific, not vague.
4. Skip obvious or trivial facts.
5. The "topic" field should be a short subject label.

IMPORTANT: Return ONLY a valid JSON object in this exact format, nothing else:
{{"cards": [
  {{"question": "...", "answer": "...", "card_type": "concept", "topic": "..."}},
  {{"question": "...", "answer": "...", "card_type": "comparison", "topic": "..."}}
]}}

Text to convert into flashcards:
{text}"""


def extract_json_array(text: str) -> list:
    """Try multiple strategies to extract valid JSON from AI response."""
    # Strategy 1: direct parse
    try:
        result = json.loads(text)
        if isinstance(result, dict) and "cards" in result:
            return result["cards"]
        if isinstance(result, list):
            return result
    except Exception:
        pass

    # Strategy 2: strip markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", text).strip().strip("`").strip()
    try:
        result = json.loads(cleaned)
        if isinstance(result, dict) and "cards" in result:
            return result["cards"]
        if isinstance(result, list):
            return result
    except Exception:
        pass

    # Strategy 3: find JSON object with "cards" key
    match = re.search(r'\{[\s\S]*"cards"[\s\S]*\}', text)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, dict) and "cards" in result:
                return result["cards"]
        except Exception:
            pass

    # Strategy 4: find JSON array directly
    match = re.search(r'\[[\s\S]*\]', text)
    if match:
        try:
            return json.loads(match.group())
        except Exception:
            pass

    return []


def generate_cards(text: str) -> list[dict]:
    """
    Sends a chunk of text to the Groq AI and gets back flashcards.
    Retries up to 2 times on JSON parse failure.
    """
    for attempt in range(3):
        try:
            filled_prompt = PROMPT.format(text=text)

            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": filled_prompt}],
                temperature=0.3,
                max_tokens=4000,
                response_format={"type": "json_object"},
            )

            raw_text = response.choices[0].message.content.strip()
            cards = extract_json_array(raw_text)

            if cards:
                return cards
            else:
                print(f"[card_generator] Attempt {attempt+1}: empty result, retrying...")

        except json.JSONDecodeError as e:
            print(f"[card_generator] JSON parse error (attempt {attempt+1}): {e}")
        except Exception as e:
            print(f"[card_generator] Unexpected error (attempt {attempt+1}): {e}")
            break

    return []
