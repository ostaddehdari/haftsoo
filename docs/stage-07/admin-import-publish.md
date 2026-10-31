# S07-W07 — Import و انتشار مدیریتی

مسیرهای مدیریت با امضای Service-to-Service استیج ۵ محافظت می‌شوند:

- `POST /v1/admin/catalog/validate`
- `POST /v1/admin/catalog/imports`
- `POST /v1/admin/catalog/releases/:releaseId/publish`

Validate هیچ Write ندارد. Import فقط سند معتبر را به Draft تبدیل و Import job ممیزی‌شده ثبت می‌کند. Publish اتمیک است. فایل خام، Cookie، Token و دادهٔ شخصی در Repository نگهداری نمی‌شود.
