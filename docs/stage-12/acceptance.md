# S12-W10 — پذیرش جست‌وجو و فیلتر پیشرفته

هر ۱۰ ورک S12 تکمیل است. Index Template سخت‌گیرانه، Pipeline تکرارپذیر، نرمال‌سازی فارسی، DSL محدود، فیلترهای پویا، Suggestion، Ranking، Saved Search و Alert پیاده‌سازی و با Unit/Contract/Performance gate پوشش داده شدند.

## SLA خروج

- Availability هدف: ۹۹٫۹٪
- Search p95: حداکثر ۲۵۰ms؛ p99: حداکثر ۶۰۰ms
- Suggestion p95: حداکثر ۱۲۰ms
- Index freshness p95: حداکثر ۳۰s
- NDCG@10: حداقل ۰٫۷۵

تأیید Production منوط به اجرای Load test روی داده هم‌اندازه تولید و ثبت Dashboard است. Secret یا داده کاربر در Fixture و Repository وجود ندارد.
