# Clara — project context & working rules for the AI

You are helping build **Clara**, a voice-first thinking app. Read this fully before suggesting or writing code. These are standing instructions — follow them on every request.

## What Clara is

A tool you talk to. The user dumps raw, often rambling thoughts (by voice or text). Clara does the invisible heavy lifting: stores each thought, sharpens it into one clear line, sorts it by theme, connects it to related past thoughts, and quietly builds a model of how the user thinks and talks. The user can later pull from everything they've stored.

One-line pitch: **think out loud, and Clara makes your mind more organized and sharper than you could keep it yourself.** The positioning is identity-level — "become a clearer thinker, never lose an idea" — not "organize your notes."

## The core philosophy (do not violate these)

1. **The user does ONE thing: dump the thought. Clara does everything else.** Storing, categorizing, connecting, sharpening — all invisible. The moment a feature asks the user to make an organizing decision (name a folder, confirm a tag, answer "do you want to…"), it breaks the product. No folders the user maintains, no manual tagging, no "organize" step.

2. **Design gate for every feature:** "Does this add a second thing the user has to do?" If yes, it moves into the invisible layer or it's cut. No exceptions.

3. **Silence is the default.** Clara is NOT a chatbot that takes turns. It does not reply to every thought. It only speaks when it has earned the interruption: a real contradiction (challenge), a genuinely relevant past thought (recall), a non-obvious connection, or one question that sharpens the thinking (sharper). Most thoughts get no reply. Too chatty = annoying coworker; too silent = a recorder. The judgment of *when to speak* is the heart of the product.

4. **Invisible only works if it's excellent.** If the sharpening or connections are wrong, the user starts wanting to check and manage it — which hands them the second job through the back door. Quality of the hidden layer is the whole bet.

5. The single most important piece of the codebase is the **`CLARA_SYSTEM` prompt** (top of the script in `public/index.html`). That prompt decides how thoughts get sharpened, sorted, connected, and when Clara speaks. It is the actual product. Tune it before chasing features. Voice/register source of truth: **`echo-voice-spec.md`** — keep it and `CLARA_SYSTEM` in sync.

## Current architecture

- **`public/index.html`** — the entire frontend: UI + logic, plain HTML/CSS/JS, no framework, no build step. Layout modeled on Granola: grey sidebar, a chat-style thread of thoughts (user thoughts as right-aligned bubbles, Clara's occasional interjections as left-aligned bubbles, connections as an amber note), a "knows:" chip bar of top themes, and a composer with a think/ask toggle at the bottom.
- **`server.js`** — minimal Express server. Serves `public/` and exposes `POST /api/chat`, which proxies to the Anthropic API using `ANTHROPIC_API_KEY` from `.env` so the key never reaches the browser.
- Model used: `claude-sonnet-4-6`.
- **Storage:** currently the browser (localStorage, or window.storage in some hosts). Thoughts and the "how you think" profile persist per-browser, per-device. This is separate from the code — editing files never touches stored data.

## Known limitations / current state

- Storage is browser-only and fragile: it does NOT survive clearing browser data, switching browsers, incognito, or changing port. Priority fix is moving storage server-side to a file or SQLite.
- Voice uses the browser Web Speech API (Chrome-best, needs mic permission); typing is the always-available fallback.
- The "How you think" profile is a simple appended-notes list, not yet a real memory layer.
- "Shared with me" is a placeholder for the future team layer.

## Roadmap (in rough priority order)

1. Move thought storage server-side (file or SQLite) so data is durable and follows the project, not the browser.
2. Tune the `CLARA_SYSTEM` prompt — especially the "when to speak" judgment — using real daily use as the test.
3. Swap browser speech for a real transcription service (Deepgram / AssemblyAI) for speed and accuracy.
4. Graduate the "How you think" profile into a proper memory layer.
5. Team layer ("Shared with me"): let a user send a developed idea to a teammate, surfaced when relevant — always gated by the user's explicit consent. Never auto-share; private by default.

## How to work with me

- Keep changes minimal and surgical; don't rewrite working files wholesale unless asked.
- Preserve the philosophy above over adding capability. When a request conflicts with "the user does one thing," flag it.
- Plain, framework-free code unless we explicitly decide to adopt a framework.
- When touching the AI behavior, change the prompt first; reach for code second.
