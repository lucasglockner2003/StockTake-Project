# AGENTS.md

## Project Overview
This is a fullstack application:
- Frontend: React (Vite)
- Backend: NestJS + Prisma
- Goal: scalable system for stock, supplier orders, automation, and roles (admin, manager, chef)

---

## Architecture Rules

- Always separate concerns:
  - Controllers -> handle requests only
  - Services -> business logic
  - Prisma -> database access
  - DTOs -> validation

- Never put business logic inside controllers
- Never access database directly from controllers

---

## Code Quality

- Always write clean, readable, production-ready code
- Use clear and descriptive naming
- Avoid duplicated logic
- Keep functions small and focused
- Do not use `any`

---

## Backend (NestJS)

- Use modular structure:
  - auth/
  - users/
  - orders/
  - supplier-orders/

- Use DTOs with class-validator
- Use JWT authentication
- Hash passwords using bcrypt
- Implement Role-based access (admin, manager, chef)
- Always validate input before saving

---

## Frontend (React)

- Keep components small and reusable
- Separate UI from logic (hooks/services)
- Do not fetch data directly inside components -> use services
- Avoid inline styles when possible
- Reuse existing components before creating new ones

---

## Naming Conventions

- Files: kebab-case
- Variables: camelCase
- Classes: PascalCase
- Constants: UPPER_CASE

---

## Error Handling

- Always handle errors properly
- Return clear error messages
- Do not expose internal errors

---

## Security

- Never store plain passwords
- Always validate user input
- Protect all private routes with JWT
- Implement role guards

---

## Database (Prisma)

- Keep schema clean and normalized
- Use relations properly
- Avoid complex queries inside controllers
- Use Prisma only inside services

---

## Rules for Codex

- Do not break existing features
- Do not create unnecessary files
- Do not install dependencies without asking
- Prefer simple solutions over complex ones
- Follow ALL rules in this file before writing code

---

## When in doubt

- Ask before making big changes
- Keep changes small and safe
