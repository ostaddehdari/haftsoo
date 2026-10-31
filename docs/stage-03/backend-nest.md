# S03-W03 — هسته Backend با NestJS

API در `apps/api` با NestJS 11 و Fastify ساخته شده و Prefix عمومی آن `/api/v1` است. ساختار اولیه عمداً Modular Monolith است:

- `HealthModule` برای Readiness/Liveness؛
- `PlatformModule` برای Metadata و قرارداد Envelope؛
- `AppModule` فقط Composition Root است.

هر دامنهٔ آینده ماژول، Controller، Application Service و Adapter مستقل خواهد داشت. وابستگی مستقیم میان ماژول‌های دامنه ممنوع و ارتباط از طریق قرارداد Application یا Event انجام می‌شود.
