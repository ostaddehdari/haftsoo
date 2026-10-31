# S06-W07 — Partition و Archive

`platform.outbox_events` بر اساس `occurred_at` و Range پارتیشن‌بندی شده و Partition پیش‌فرض مانع توقف Write در مرز ماه می‌شود. Worker نگهداری پیش از شروع هر ماه Partition ماه بعد را می‌سازد و داده قدیمی را طبق `database/partition-policy.json` منتقل می‌کند.

Archive در Object storage سازگار S3 با WORM، Parquet و SHA-256 ذخیره می‌شود. `platform.archive_manifest` بازه، تعداد ردیف، Object key، Checksum و وضعیت Restore را ثبت می‌کند. Detach یا Purge بدون Manifest تأییدشده و تست Restore ممنوع است.
