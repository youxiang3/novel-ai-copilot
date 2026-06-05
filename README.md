# NovelAI Copilot

NovelAI Copilot is an AI-assisted long-form fiction workspace for web novel authors and content studios. It combines a three-column writing desk, story memory, Lore management, scene-to-chapter generation, IP adaptation tools, and a planned Skill workshop for reusable writing workflows.

## Current Highlights

- Three-column writing workspace: chapters, Lore, ideas, editor, AI copilot, IP tools, and Prompt Inspector.
- Question-driven novel opening guide for genre, hook, protagonist, world rules, and first scene.
- Scene-to-Chapter input with streaming-ready generation flow and local fallback.
- Lore CRUD prototype with categories, tags, visual prompt fields, and search.
- Idea capture and reuse.
- Writing Skill prototype for suspense, sensory detail, conflict, cliffhanger, and genre rhetoric.
- Local browser persistence for prototype data.
- Product PRD in `PRODUCT_DOCUMENT.md`.

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, TailwindCSS, lucide-react.
- Backend: Spring Boot 3, Java 17, PostgreSQL, Redis, MyBatis Plus, Spring AI, JWT.
- AI provider: OpenAI-compatible API, default base URL for DeepSeek.

## Repository Structure

```text
novel-ai-copilot/
  frontend/              Next.js frontend
  backend/               Spring Boot backend
  PRODUCT_DOCUMENT.md    consolidated product document
  docs/PROJECT_STATUS.md current implementation status and next steps
  docs/archive/          archived early drafts and old notes
```

## Project Status

See `docs/PROJECT_STATUS.md` for the current completed / unfinished feature list, product-document coverage, and next-step plan. For local database setup, curl samples, and end-to-end verification notes, see `docs/E2E_TESTING.md`.

## Frontend Setup

Requirements:

- Node.js 18.17 or later. Node 20 is recommended.

Install and run:

```powershell
cd frontend
npm install
npm run dev
```

If your default Node.js is too old, run Next directly with a newer Node executable:

```powershell
cd D:\aiProject\ai-created-novel\novel-ai-copilot\frontend
& "D:\nvm\v20.20.2\node.exe" "D:\aiProject\ai-created-novel\novel-ai-copilot\frontend\node_modules\next\dist\bin\next" dev
```

Open:

```text
http://localhost:3000
```

## Backend Setup

Requirements:

- Java 17 or later.
- Maven.
- PostgreSQL 15 or later.
- Redis.

Create a local environment file or configure system environment variables based on `.env.example`:

```text
AI_API_KEY=sk-xxx
AI_BASE_URL=https://api.deepseek.com/v1
AI_MODEL=deepseek-chat
AI_TEMPERATURE=0.7
AI_MAX_TOKENS=4096
DB_HOST=localhost
DB_PORT=5432
DB_NAME=novel_ai_copilot
DB_SCHEMA=public
DB_USERNAME=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=change-me-in-production-at-least-32-chars
JWT_EXPIRATION=604800
JWT_ISSUER=novel-ai-copilot
JWT_AUDIENCE=novel-ai-users
ENCRYPTION_KEY=change-me-32-byte-key-for-dev-only
SPRING_PROFILES_ACTIVE=dev
SERVER_PORT=8080
FRONTEND_ORIGIN=http://localhost:3000
LOG_LEVEL=DEBUG
```

Initialize PostgreSQL before the first backend run:

```powershell
createdb -h localhost -p 5432 -U postgres novel_ai_copilot
psql -h localhost -p 5432 -U postgres -d novel_ai_copilot -f backend/src/main/resources/db/schema.sql
```

Make sure Redis is listening on `localhost:6379`:

```powershell
Test-NetConnection -ComputerName localhost -Port 6379
```

Run the backend:

```powershell
cd backend
mvn spring-boot:run
```

Backend default URL:

```text
http://localhost:8080
```

Swagger UI:

```text
http://localhost:8080/swagger-ui.html
```

## Development Status

This repository is currently an active prototype. The frontend workspace, Skill interfaces, and Agent Task MVP are in place and compile successfully. The next milestone is completing a real PostgreSQL-backed HTTP verification run for auth, novels, chapters, Lore, model configuration, Skill endpoints, and Agent automatic novel creation.

## Important Notes

- Do not commit real API keys or production secrets.
- Frontend prototype data is stored in browser `localStorage` until backend persistence is fully connected.
- `node_modules`, `.next`, backend `target`, logs, and local environment files are ignored by Git.
