# S06-W04 — Migration و Rollback

هر تغییر دارای جفت `*.up.sql` و `*.down.sql` است. Runner در `scripts/db-migrate.mjs`:

- Migrationها را ترتیبی و داخل Transaction اجرا می‌کند.
- SHA-256 هر فایل را در `public.haftsoo_schema_migrations` ثبت می‌کند.
- Drift فایل اعمال‌شده را رد می‌کند.
- فقط آخرین Migration را Rollback می‌کند.
- URL پایگاه را از Environment یا Secret file می‌خواند و در خروجی چاپ نمی‌کند.

فرمان‌ها: `npm run db:migrate`، `npm run db:rollback` و `npm run db:status`. Migration اعمال‌شده هرگز ویرایش نمی‌شود؛ تغییر جدید فایل نسخه بعدی است.
