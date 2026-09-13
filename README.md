# Clara

A voice-first thinking app. You do one thing — talk, or type a thought. Clara does the rest: it sharpens each thought into a line, sorts it by theme, connects it to things you've said before, occasionally pushes back when it's earned it, and quietly builds a model of how you think and talk. Layout is modeled on Granola: a calm grey sidebar, a feed of your thinking grouped by day, and an "ask your thinking" bar at the bottom.

## Run it locally

You'll need [Node.js 18+](https://nodejs.org).

```bash
npm install
cp .env.example .env        # then open .env and paste your Anthropic API key
npm run dev
```

Open http://localhost:3000.

Get an API key at https://console.anthropic.com → Settings → API Keys. Your key lives only in `.env` on your machine and is used server-side — it never touches the browser.

## How it works

- **`public/index.html`** — the entire frontend (UI + logic). This is where you'll spend most of your time editing. No build step, no framework — just open it and change things.
- **`server.js`** — a tiny server that serves the app and proxies Claude calls so your key stays private.
- The **`CLARA_SYSTEM`** prompt near the top of the `<script>` in `index.html` is the brain — it decides how a thought gets sharpened, sorted, connected, and when Clara speaks back. **This prompt is the actual product.** Tune it first; it's where Clara feels smart or dumb.

Your thoughts are stored locally in your browser (per device). Nothing is sent anywhere except the Claude calls that process them.

## Notes

- Voice uses the browser's built-in speech recognition — works best in Chrome and asks for mic permission. Typing always works as a fallback.
- The "How you think" view fills in after you've fed it a couple dozen real thoughts — that's when it has enough of you to model.
- "Shared with me" is a placeholder for the future team layer (ideas teammates send you).

## Push it to GitHub

```bash
git init
git add .
git commit -m "Clara MVP"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/clara.git
git branch -M main
git push -u origin main
```

Then open the folder in Cursor and start editing. Begin with the `CLARA_SYSTEM` prompt and the capture flow — that's the heart of it.

## What to build next

1. Move thought storage from the browser to a real database (so it follows you across devices).
2. Swap browser speech for a real transcription service (Deepgram / AssemblyAI) for speed and accuracy.
3. Graduate the "How you think" profile from appended notes to a proper memory layer.
4. Build the team layer: let a thought be sent to a teammate, gated by your explicit consent.
