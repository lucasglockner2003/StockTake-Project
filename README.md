# SmartOps - Restaurant Workflow Automation

SmartOps is a production-oriented restaurant operations system focused on inventory capture, order review, and controlled supplier order execution.

This project is intentionally built around operational safety:
- human correction before execution
- screenshot evidence at key stages
- explicit chef approval gate before final submit
- manual trigger flow only (no scheduler, no auto-run)

## What SmartOps Does Today

### 1) Stocktake Capture
- Manual stocktake entry for kitchen teams
- Voice capture flow for fast quantity input
- Photo OCR capture flow for handwritten/printed order notes

### 2) Review and Correction
- Parsed entries are matched against catalog items
- Team can correct item mapping and quantities
- Suggested order output is reviewed before automation

### 3) Daily Order Execution
- Daily confirmed orders are stored locally
- Orders move through the existing state machine with manual transitions
- Bot fill and final submit are manually triggered by chef/operator actions

### 4) Bot Service Layer
- Dedicated `bot-service` (Node + Express) executes browser automation via Playwright
- Endpoints handle fill and final submit separately:
  - `POST /execute-daily-order`
  - `POST /submit-daily-order`
- Includes structured execution responses for safer retry/error UX

### 5) Mock Supplier Portal (Safety Environment)
- Automation targets the mock supplier portal only
- Used for safe testing of:
  - login
  - item fill
  - review screenshot capture
  - final submit simulation
  - mock order number generation

## Safety-Critical Gate: Chef Review Before Final Submit

SmartOps enforces a manual approval gate:
1. Bot fills order and stops at review stage
2. Chef reviews evidence (screenshot + order details)
3. Chef explicitly triggers final submit

No automatic submit is performed.

## Architecture Snapshot

- Frontend: React + Vite
- Local persistence: `localStorage` (current phase)
- Automation service: Node.js + Express
- Browser automation: Playwright
- Test target portal: `mock-portal`

## Run Locally

Install:
```bash
npm install
```

Frontend:
```bash
npm run dev
```

Mock supplier portal:
```bash
npm run mock:portal
```

Bot service:
```bash
npm run bot:service
```

## Environment Variables

- `VITE_DAILY_ORDER_BOT_SERVICE_URL` (frontend, optional)  
  default: `http://localhost:4190`
- `BOT_SERVICE_PORT` (bot-service, optional)  
  default: `4190`
- `MOCK_PORTAL_URL` (bot-service/bot runners, optional)  
  default: `http://localhost:4177`

## Current Product Focus

SmartOps is currently focused on execution reliability and operational safety:
- retry UX improvements
- structured error handling
- bot execution stability
- failure visibility without silent data loss

## Roadmap

### Current
- Reliability hardening
- Retry UX and operator feedback
- Structured bot/service errors
- Bot execution stability and recovery behavior

### Later
- Multi-supplier execution support
- Remote headless execution infrastructure
- Persistent execution storage
- SaaS multi-restaurant architecture
- PWA tablet support for kitchen operations
