# SmartOps

SmartOps is a fullstack operations workspace for stock take, supplier order execution, automation queue tracking, and invoice intake.

## Stack

- Frontend: React + Vite
- Backend: NestJS + Prisma
- Database: PostgreSQL

## Minimal Environment

Frontend file: `.env`

```env
# Production frontend API
# VITE_API_BASE_URL=https://stocktake-project.onrender.com/api

# Local development proxy targets
VITE_DEV_API_PROXY_TARGET=http://localhost:3000
VITE_DEV_BOT_SERVICE_PROXY_TARGET=http://localhost:4190
VITE_DEV_PHOTO_OCR_PROXY_TARGET=http://localhost:3001
VITE_DEV_MOCK_PORTAL_PROXY_TARGET=http://localhost:4177

# Optional direct integration URLs for hosted external services
# VITE_DAILY_ORDER_BOT_SERVICE_URL=https://your-bot-service.onrender.com
VITE_BOT_SERVICE_TIMEOUT_MS=30000
# VITE_MOCK_PORTAL_URL=https://your-mock-portal.onrender.com
```

Backend file: `backend/.env`

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartops?schema=public
JWT_ACCESS_SECRET=change-this-access-secret-before-production-1234
JWT_REFRESH_SECRET=change-this-refresh-secret-before-production-1234
JWT_EXPIRES_IN=86400
PASSWORD_SALT_ROUNDS=12
CORS_ALLOWED_ORIGINS=http://localhost:5173
AUTH_ALLOW_PUBLIC_REGISTRATION=false
BOT_SERVICE_BASE_URL=http://localhost:4190
BOT_SERVICE_TIMEOUT_MS=30000
ADMIN_SEED_EMAIL=admin@smartops.com
ADMIN_SEED_PASSWORD=12345678
```

## Bootstrap Database

Start PostgreSQL with Docker:

```powershell
docker run --name smartops-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=smartops -p 5432:5432 -d postgres:16
```

Apply Prisma migrations:

```powershell
npm.cmd --prefix backend run prisma:deploy
```

## Run Backend

```powershell
npm.cmd --prefix backend run start:dev
```

Backend base URL:

```text
http://localhost:3000/api
```

## Run Frontend

```powershell
npm.cmd run dev
```

Frontend dev URL:

```text
http://localhost:5173
```

During local development, the frontend uses relative paths such as `/api` and Vite proxies them to the targets configured in `.env`.

## Frontend Deploy

For Render Static Site or Vercel, configure:

- Build command: `npm run build`
- Publish directory: `dist`
- Required environment variable: `VITE_API_BASE_URL=https://stocktake-project.onrender.com/api`

If you host optional services separately, also configure:

- `VITE_DAILY_ORDER_BOT_SERVICE_URL`
- `VITE_PHOTO_OCR_API_BASE_URL`
- `VITE_MOCK_PORTAL_URL`

If you deploy the frontend as a Node web service instead of a static site, use preview only as a fallback:

```powershell
npm.cmd run preview -- --host 0.0.0.0 --port $PORT
```

## Seed Initial Admin

Run the official seed after the database migrations:

```powershell
npm.cmd --prefix backend run seed:admin
```

Example initial credentials from `backend/.env.example`:

- Email: `admin@smartops.com`
- Password: `12345678`

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each have at least 32 characters. `JWT_SECRET` is accepted only as a legacy fallback in development.

`CORS_ALLOWED_ORIGINS` accepts one or more frontend URLs separated by commas. In production it is required, for example: `https://your-frontend.onrender.com,https://admin.your-domain.com`.

## Full Run From Zero

Execute these commands in order from the project root:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
npm.cmd install
npm.cmd --prefix backend install
docker run --name smartops-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=smartops -p 5432:5432 -d postgres:16
npm.cmd --prefix backend run prisma:generate
npm.cmd --prefix backend run prisma:deploy
npm.cmd --prefix backend run seed:admin
```

Then start the services in separate terminals:

```powershell
npm.cmd --prefix backend run start:dev
```

```powershell
npm.cmd run dev
```
