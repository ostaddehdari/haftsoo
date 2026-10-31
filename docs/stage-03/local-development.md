# S03-W09 — محیط توسعه محلی

پیش‌نیازها: Node 22، npm 10، Go 1.24 و Docker Compose.

اجرای Native:

```bash
npm ci
npm run dev:web
npm run dev:api
cd services/chat && go run ./cmd/server
```

اجرای Containerized:

```bash
docker compose -f compose.dev.yaml up --build
```

پورت‌ها: Web روی `3000`، API روی `3001` و Chat روی `3002`. فایل `compose.yaml` فعلی مخصوص Prototype تولید است و تا استیج زیرساخت بدون تغییر باقی می‌ماند.
