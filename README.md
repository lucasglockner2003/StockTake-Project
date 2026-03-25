# SmartOps

SmartOps is a fullstack operations workspace for stock take, supplier order execution, automation queue tracking, and invoice intake.

## Stack

- Frontend: React + Vite
- Backend: NestJS + Prisma
- Database: PostgreSQL

## Minimal Environment

Frontend file: `.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_DAILY_ORDER_BOT_SERVICE_URL=http://localhost:4190
VITE_BOT_SERVICE_TIMEOUT_MS=30000
VITE_MOCK_PORTAL_URL=http://localhost:4177
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

## Seed Initial Admin

Run the official seed after the database migrations:

```powershell
npm.cmd --prefix backend run seed:admin
```

Example initial credentials from `backend/.env.example`:

- Email: `admin@smartops.com`
- Password: `12345678`

`JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` must each have at least 32 characters. `JWT_SECRET` is accepted only as a legacy fallback in development.

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
