# S07-W06 — API عمومی کشف و فرم

مسیرهای عمومی نسخه ۱:

- `GET /v1/catalog/categories/tree`
- `GET /v1/catalog/categories/:slug/form`

هر درخواست `x-tenant-id` معتبر می‌خواهد. پاسخ Envelope شامل نسخه کاتالوگ است. `ETag` از Checksum نسخه و برای فرم از Slug ساخته می‌شود؛ Cache-Control دارای ۶۰ ثانیه Fresh و ۳۰۰ ثانیه stale-while-revalidate است.
