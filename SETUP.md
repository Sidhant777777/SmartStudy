# FlashCard AI — Setup Guide

## Project Structure
```
flashcard-ai/
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── pdf_parser.py
│   ├── card_generator.py
│   ├── requirements.txt
│   └── .env          ← create this from .env.example
└── frontend/         ← we create this with commands below
    └── src/
        ├── App.jsx
        ├── api.js
        ├── pages/
        │   ├── HomePage.jsx
        │   └── ReviewPage.jsx
        └── components/
            ├── FlashCard.jsx
            └── StatCard.jsx
```

---

## Step 1: Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Copy .env.example to .env and add your Groq key
# Get free key from: https://console.groq.com
```

Run backend:
```bash
cd backend
uvicorn main:app --reload
```
Backend runs at: http://localhost:8000
Test it at: http://localhost:8000/docs

---

## Step 2: Create React App with Vite

```bash
# Go to your project root (flashcard-ai folder)
cd flashcard-ai

# Create React app (say YES to everything it asks)
npm create vite@latest frontend -- --template react

# Go into frontend folder
cd frontend

# Install dependencies
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

---

## Step 3: Configure Tailwind

Open `frontend/tailwind.config.js` and replace its contents with:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Open `frontend/src/index.css` and replace EVERYTHING with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## Step 4: Copy Your Source Files

Copy these files into `frontend/src/`:
- App.jsx        → frontend/src/App.jsx
- api.js         → frontend/src/api.js
- pages/         → frontend/src/pages/
- components/    → frontend/src/components/

---

## Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: http://localhost:5173

---

## Both Running Together

Terminal 1 (backend):
```bash
cd backend && uvicorn main:app --reload
```

Terminal 2 (frontend):
```bash
cd frontend && npm run dev
```

Open http://localhost:5173 in your browser.
