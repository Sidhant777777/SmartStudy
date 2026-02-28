# ================================================================
# pdf_parser.py
# ================================================================
# This file handles reading text out of a PDF file.
#
# The problem with sending a whole PDF to an AI:
#   - PDFs can be 50+ pages
#   - AI models have a "context limit" — they can't read everything at once
#   - Sending too much at once = expensive + slower
#
# Our solution: CHUNKING
#   Split the PDF text into smaller pieces (~2000 characters each)
#   Then send each piece to the AI separately to generate cards
#
# This file has 2 functions:
#   extract_text() → reads all text from a PDF file
#   chunk_text()   → splits that text into smaller pieces
# ================================================================

import fitz  # this is PyMuPDF — install with: pip install pymupdf
             # "fitz" is just the name of the module inside pymupdf


def extract_text(file_bytes: bytes) -> str:
    """
    Reads all the text from a PDF and returns it as a single string.

    Why does it take "bytes" instead of a filename?
    ------------------------------------------------
    When a user uploads a file through our API, FastAPI gives us
    the file contents as raw bytes (0s and 1s), not a filepath.
    PyMuPDF can open PDFs directly from bytes using stream=file_bytes.

    What does the function do step by step?
    ----------------------------------------
    1. Open the PDF from the bytes
    2. Loop through every page
    3. Extract the text from each page
    4. Join all pages together with newlines
    5. Close the PDF and return the text

    Example output:
        "Chapter 1: Introduction to Machine Learning\n
         Machine learning is a subset of AI...\n
         ..."
    """

    # fitz.open() opens the PDF
    # stream=file_bytes tells it to read from bytes, not a file path
    # filetype="pdf" tells it what kind of file this is
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    # Loop through every page, extract text, join with newline
    # page.get_text() returns the text content of that page as a string
    all_text = "\n".join(page.get_text() for page in doc)

    doc.close()  # always close the document when done

    return all_text


def chunk_text(text: str, chunk_size: int = 2000, overlap: int = 200) -> list[str]:
    """
    Splits a long text into smaller overlapping chunks.

    Why do we need chunks?
    ----------------------
    AI models can only process a limited amount of text at once.
    If your PDF has 10,000 characters, we can't send it all at once.
    So we split it into pieces of ~2000 characters each.

    Why overlap?
    ------------
    Imagine your text says:
        "...gradient descent minimizes the loss function. | Adam optimizer
        improves upon gradient descent by..."
    
    If we split exactly at the |, the second chunk loses context about
    gradient descent. Overlap means the second chunk includes the last
    200 characters of the first chunk — so context is preserved.

    Parameters:
        text       → the full PDF text
        chunk_size → how many characters per chunk (default: 2000)
        overlap    → how many characters to repeat between chunks (default: 200)

    Returns:
        A list of text chunks, each ~2000 characters long
    """

    chunks = []   # we'll collect all chunks here
    start = 0     # where the current chunk starts in the text

    # Keep making chunks until we've covered the whole text
    while start < len(text):

        # Where this chunk ends (start + 2000 characters)
        end = start + chunk_size

        # Grab this chunk of text
        chunk = text[start:end]

        # Try to break at a sentence ending (.) instead of mid-word
        # rfind('.') finds the LAST period in the chunk
        last_period = chunk.rfind('.')

        # Only break at the period if it's in a reasonable position
        # (not too close to the beginning of the chunk)
        if last_period > chunk_size * 0.7:
            end = start + last_period + 1       # include the period
            chunk = text[start:end]

        # Only keep chunks that have meaningful content (> 100 chars)
        # This filters out blank pages or nearly-empty sections
        if len(chunk.strip()) > 100:
            chunks.append(chunk.strip())

        # Move the start forward, but go back by `overlap` characters
        # so the next chunk repeats the last 200 chars of this one
        start = end - overlap

    return chunks
