# S03-W10 — گیت خروج Build تکرارپذیر

## معیار پذیرش

- [x] Workspaceهای Web، API و Contracts تعریف شده‌اند.
- [x] Nuxt 3 با Base Path و Healthcheck ساخته می‌شود.
- [x] NestJS با ماژول‌های هسته و Fastify ساخته می‌شود.
- [x] سرویس Chat با Go Build و Test مستقل دارد.
- [x] قراردادهای مشترک Version شده‌اند.
- [x] Lint، Format، Typecheck و Commitlint قابل اجرا هستند.
- [x] Branching و Release Policy مستند است.
- [x] CI برای Node و Go تعریف شده است.
- [x] Compose محلی هر سه سرویس را بالا می‌آورد.
- [x] `scripts/build-stage-03.sh` گیت Build واحد ارائه می‌کند.

## فرمان گیت

```bash
bash scripts/build-stage-03.sh
```

استقرار عمومی موجود عمداً با `compose.yaml` ثابت مانده تا Prototype قطع نشود. جایگزینی آن با Imageهای برنامه در S04 و پس از تعریف محیط‌ها، Registry و Secret Management انجام می‌شود.
