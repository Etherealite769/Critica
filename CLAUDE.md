# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Critica is a full-stack learning app with a Django REST Framework backend (`backend/`) and a Next.js (App Router) frontend (`frontend/`). It teaches critical-reading/reasoning skills through four "gamemode" exercise modules, each with AI-generated (Gemini) or procedurally-generated practice sessions, spaced-repetition vocab review, XP/streak progression, and an adaptive hint ("scaffold") engine.

## Commands

### Backend (`backend/`)
```bash
python -m venv venv && venv\Scripts\activate      # Windows
pip install -r requirements.txt
python manage.py migrate                           # Django ORM (SQLite) tables only
python manage.py runserver                          # http://localhost:8000
python manage.py makemigrations                     # after changing api/models.py or submodule models
python manage.py test api                            # Django test runner (per-app tests.py / scripts/test_*.py)
```
There are two near-identical dependency files — `requirement.txt` and `requirements.txt`; `requirements.txt` is the one actually used by setup docs.

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # next dev, http://localhost:3000
npm run build    # next build
npm run start    # serve production build via `next start`
npm run serve    # serve production build via server.js (custom server, used on Railway/Render-style hosts)
npm run lint      # eslint
```
Frontend expects the backend at `NEXT_PUBLIC_API_URL` (defaults to `http://127.0.0.1:8000/api`), see `frontend/src/lib/api.ts`.

## Architecture

### Dual-database split
- **SQLite** (`backend/db.sqlite3`, Django ORM): auth-adjacent/local data only — the legacy `api.models` `User`/`TelemetryLog` Django models used for Django-native queries and as a telemetry backup.
- **MongoDB** (via `mongoengine`, connected in `backend/config/settings.py`): the primary data store. Every app that persists real data has a `mongo_models.py` with `mongoengine.Document` classes (`StudentProfileDocument`, `GeneratedSessionDocument`, `LexicalReviewDocument`, `TelemetryLogDocument`, etc.) alongside Django's `models.py`. `MONGO_URI` env var selects Atlas vs. local `mongodb://localhost:27017/CriticaDB`.
- Auth is custom JWT (`api/authentication.py`, `PyJWT`, not `djangorestframework-simplejwt`'s middleware) checked against the Mongo `User` document by email — `rest_framework_simplejwt` is installed but the actual auth class wired into `REST_FRAMEWORK` is `api.authentication.CustomJWTAuthentication`.

### Backend app layout (`backend/api/`)
Each Django app under `api/` owns one concern and is registered independently in `INSTALLED_APPS`:
- `api/` (root) — `User`/register/login views, `urls.py` root router.
- `api/progression/` — `ProgressionManagementService`: node unlock graph (`NODE_UNLOCK_MAP`), XP/level thresholds, streaks. This is the source of truth for which nodes a student can access.
- `api/scaffold/` — `ScaffoldEngineService`: decides when to escalate hints (3 consecutive wrong answers or 60s inactivity) and computes hint tier from module completion %. Writes telemetry to both Mongo and SQLite.
- `api/lexical/` — `SpacedRepetitionService`: SM-2-style spaced repetition scheduling for vocabulary words surfaced during exercises.
- `api/modules/{logic_thread,snap_gap,tap_clues,fact_scanner}/` — one Django app per gamemode, each with its own `services.py`/`views.py`/`mongo_models.py` for mode-specific exercise persistence and scoring.
- `api/ai/` — the AI session layer shared by all four gamemodes:
  - `gemini_client.py` — wraps Google Gemini (`google-genai` SDK, falling back to legacy `google-generativeai`), with a model cascade (`MODEL_CASCADE`) and per-module Pydantic schemas (`schemas.py`) for structured JSON output.
  - `fallback_pool.py` — large (32+ discipline) procedural exercise bank used when Gemini is unavailable/unconfigured, so offline mode still has wide, non-repeating variety.
  - `session_service.py` — `SessionService`, the orchestrator: loads/creates sessions, evaluates answers, issues live Socratic hints, tracks progress, and completes sessions (awarding XP via `ProgressionManagementService` and logging via `ScaffoldEngineService`).
  - `prompt_builder.py` / `validators.py` — builds Gemini prompts per module and validates/sanitizes generated question batches.
  - `views.py` routes live under `/api/ai/session/...` — route ordering in `urls.py` matters: specific suffixed routes (`.../evaluate/...`, `.../mastery/`) are declared before the generic `session/<module>/<node_id>/` catch-all to avoid it swallowing them.

### Node ID / unlock scheme
Exercise nodes use short module prefixes + zero-padded index: `log_node_NN` (Logic Thread), `snp_node_NN` (Snap-in Gap), `tap_node_NN` (Tap the Clues), `fac_node_NN` (Fact Scanner). Node number mod 3 determines difficulty tier (1/2/3 → Basics/Intermediate/Advanced), mirrored in both `api/progression/services.py` (`get_diff`) and the frontend (`frontend/src/lib/nodeSession.ts` `nodeDifficulty`) — keep these in sync if the scheme changes. The first node of each module (`*_node_01`) is always unlocked; subsequent nodes unlock via `NODE_UNLOCK_MAP` on completion.

### Frontend structure (`frontend/src/`)
- `app/nodes/{logic-thread,snap-gap,tap-clues,fact-scanner}/[nodeId]/` — one dynamic route per gamemode, each pairing a `page.tsx` with a `page.module.css`.
- `app/dashboard/`, `app/auth/`, `app/lexical/` — dashboard, login/register, and vocabulary review pages.
- `lib/api.ts` — `apiFetch` helper: attaches JWT from `localStorage` (`accessToken`), throws `{...data, status}` on non-OK responses.
- `lib/nodeSession.ts` — client-side session API wrappers and difficulty/color constants mirroring backend node logic.
- `lib/realtime-sync.ts` — cross-component progression update notifications (e.g. after completing a node, dashboard XP/streak widgets refresh).
- This Next.js version deviates from the trained-on conventions per `frontend/AGENTS.md` — check `node_modules/next/dist/docs/` before relying on prior Next.js knowledge for APIs/conventions.

### Deployment
Backend serves static files via `whitenoise` and runs under `gunicorn` (`Procfile`); CORS/CSRF/allowed-hosts in `backend/config/settings.py` are pre-configured for Vercel (frontend) + Render/Railway (backend) with explicit prod origins plus `*.vercel.app` regex allowances.
