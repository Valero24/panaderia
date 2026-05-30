# Cartagena Concierge - Staging/Production Deploy

This project runs as three services:

- `frontend`: Next.js public/admin UI.
- `backend`: NestJS API, Prisma, invoices/PDF generation.
- `postgres`: PostgreSQL database.

## 1. Required Files

Copy the examples before deploying:

```bash
cp .env.deploy.example .env
cp env/backend.staging.env.example env/backend.staging.env
```

For production without Docker, use:

```bash
cp backend/.env.production.example backend/.env.production
cp frontend/.env.production.example frontend/.env.production
```

Never commit real secrets.

## 2. Required Variables

Root `.env` for Docker:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `BACKEND_PORT`
- `FRONTEND_PORT`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` only for legacy compatibility.

Backend env:

- `DATABASE_URL`
- `JWT_SECRET` with 32+ characters.
- `CORS_ORIGIN`
- `FRONTEND_URL`
- `WOMPI_BASE_URL`
- `WOMPI_PUBLIC_KEY`
- `WOMPI_PRIVATE_KEY`
- `WOMPI_EVENTS_SECRET`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM`
- `WHATSAPP_PROVIDER`, `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, `WHATSAPP_FROM_NUMBER`

Frontend env:

- `NEXT_PUBLIC_API_URL`

## 3. Local Staging With Docker

```bash
docker compose build
docker compose up -d
docker compose logs -f backend
```

The backend container runs:

```bash
npx prisma migrate deploy
node dist/src/main.js
```

Default local URLs:

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

## 4. Production Deploy Steps

1. Point domains:
   - `app.example.com` to the frontend.
   - `api.example.com` to the backend.
2. Set `.env`:
   - `NEXT_PUBLIC_API_URL=https://api.example.com`
   - `CORS_ORIGIN=https://app.example.com`
   - `FRONTEND_URL=https://app.example.com`
3. Set Wompi webhook URL:
   - `https://api.example.com/payments/wompi/webhook`
4. Build and start:

```bash
docker compose build --no-cache
docker compose up -d
docker compose ps
```

5. Verify:

```bash
docker compose logs --tail=100 backend
docker compose exec backend npx prisma migrate status
curl https://api.example.com/properties
```

## 5. SSL / Reverse Proxy

Use a reverse proxy in front of Docker. Caddy is the simplest option because it handles certificates automatically. See `ops/Caddyfile.example`.

Expected routing:

- `app.example.com` -> `frontend:3000`
- `api.example.com` -> `backend:3000`

If using Nginx, enable:

- HTTPS only.
- HTTP to HTTPS redirect.
- `proxy_set_header Host $host`.
- `proxy_set_header X-Forwarded-Proto https`.
- Reasonable request body limits.

## 6. Persistence

Docker volumes:

- `postgres_data`: database files.
- `backend_uploads`: generated invoices and uploaded files in `/app/uploads`.

Host folder:

- `./backups`: database dumps created by backup scripts.

Do not delete these volumes during deploy.

## 7. Backups

Windows PowerShell:

```powershell
.\ops\backup-postgres.ps1
```

Linux/macOS:

```bash
sh ./ops/backup-postgres.sh
```

Recommended schedule:

- Staging: daily.
- Production: daily plus before every deploy.

Keep at least 7 daily backups and 4 weekly backups.

## 8. Restore

Restore overwrites the target database content.

Windows PowerShell:

```powershell
.\ops\restore-postgres.ps1 -BackupFile .\backups\cartagena_db-YYYYMMDD-HHMMSS.dump
```

Linux/macOS:

```bash
sh ./ops/restore-postgres.sh backups/cartagena_db-YYYYMMDD-HHMMSS.dump
```

After restore:

```bash
docker compose restart backend
docker compose exec backend npx prisma migrate status
```

## 9. Logs and Monitoring

Basic commands:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose ps
```

The compose file rotates container logs with:

- `max-size=10m`
- `max-file=5`

Monitor these events first:

- Wompi webhook failures.
- Payment approval without booking.
- Notification failures.
- PDF generation errors.
- Database connection failures.
- Rate limit spikes on login and checkout.

## 10. Production Checklist

- [ ] Real `JWT_SECRET` with 32+ characters.
- [ ] Real Postgres password, not shared with staging.
- [ ] `NODE_ENV=production`.
- [ ] `CORS_ORIGIN` only includes real frontend domains.
- [ ] `NEXT_PUBLIC_API_URL` points to the public API domain.
- [ ] Wompi production keys configured.
- [ ] Wompi webhook URL configured and signed events tested.
- [ ] Mail credentials configured.
- [ ] WhatsApp provider credentials configured.
- [ ] Backups tested with one restore rehearsal.
- [ ] `backend_uploads` volume mounted and preserved.
- [ ] SSL active for frontend and API.
- [ ] Admin seed passwords changed or disabled.
- [ ] Stripe legacy keys empty unless explicitly needed.
- [ ] `docker compose logs backend` has no missing required env errors.
- [ ] End-to-end assisted booking tested in staging.

## 11. Known Risks / Future Work

- Frontend auth still uses `localStorage`; move to httpOnly cookies in a future security block.
- In-memory rate limiting is per container. Use Redis if scaling backend horizontally.
- Images are stored as URLs, while invoices are persisted in `backend_uploads`.
- Experiences and packages still need complete production-grade product models.
- Use a managed Postgres service for higher availability when real revenue begins.
