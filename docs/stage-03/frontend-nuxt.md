# S03-W02 — پوسته Frontend با Nuxt 3

وب در `apps/web` با Nuxt `3.21.11`، TypeScript سخت‌گیرانه و Nitro Node Server ساخته می‌شود. زبان سند `fa-IR` و جهت `rtl` است.

- `NUXT_APP_BASE_URL` مسیر پایه را برای `/haftsoo/` یا `/` تعیین می‌کند.
- `NUXT_PUBLIC_API_BASE` آدرس API را بدون Hard-code در UI تزریق می‌کند.
- `/healthz` سلامت Process و `/api/v1/meta` اطلاعات نسخه را برمی‌گرداند.
- CSS اولیه از توکن‌ها و قواعد Responsive استیج ۲ پیروی می‌کند.

فرمان‌ها: `npm run dev:web`، `npm run build:web` و `npm run typecheck --workspace @haftsoo/web`.
