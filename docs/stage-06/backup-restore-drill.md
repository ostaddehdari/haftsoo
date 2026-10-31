# S06-W09 — Drill پشتیبان‌گیری و بازیابی

`scripts/recovery-drill.sh` یک PostGIS یک‌بارمصرف می‌سازد، تمام Migrationها را اعمال می‌کند، داده Tenant-isolated و Outbox/Inbox می‌نویسد، Custom dump می‌گیرد و در Database تازه Restore می‌کند.

گیت موفقیت:

- هر ۹ Schema و PostGIS در مقصد حاضر باشند.
- داده Registry و Outbox پس از Restore قابل خواندن باشد.
- حداقل یک Partition Outbox وجود داشته باشد.
- Down migrationها همه Schemaهای برنامه را پاک کنند.
- Up migrationها پس از Rollback دوباره بدون خطا اجرا شوند.

Credential تصادفی در پوشه موقت با مجوز 0600 ساخته و در Trap حذف می‌شود. هیچ Dump یا Secret وارد Git نمی‌شود.
