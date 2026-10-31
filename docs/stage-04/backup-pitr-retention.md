# S04-W08 — Backup، PITR و Retention

هدف بازیابی: RPO حداکثر ۱۵ دقیقه و RTO حداکثر ۶۰ دقیقه. سیاست دقیق در `ops/backup/retention.json` است: WAL پیوسته و پنجره PITR هفت‌روزه، ۷ Backup روزانه، ۴ هفتگی و ۶ ماهانه، رمزنگاری، Checksum و کپی Cross-region.

Runbook Restore:

1. اعلام Incident و Freeze نوشتن در صورت نیاز.
2. انتخاب Restore point و ثبت زمان UTC.
3. بازیابی روی Instance جدید، نه روی منبع آسیب‌دیده.
4. بررسی PostGIS، تعداد ردیف‌ها، Foreign keyها و نمونه فایل‌ها.
5. اجرای Smoke test برنامه و تأیید مالک دامنه.
6. جابه‌جایی Traffic و نگهداری منبع قبلی برای Forensics.
7. ثبت زمان واقعی RPO/RTO و اقدام اصلاحی.

CI با داده مصنوعی Dump/Restore را اجرا می‌کند؛ آزمون فصلی باید Object storage و سناریوی PITR واقعی را نیز پوشش دهد.
