# S07-W08 — قرارداد JSON و مهاجرت داده

قرارداد ورودی `schemaVersion: 1` شامل Source، Categories، Fields و Forms است. کلیدها ASCII پایدارند و متن فارسی در Title/Description قرار می‌گیرد. فایل نمونه در `fixtures/catalog/sample-catalog.json` قرار دارد.

فرمان بررسی آفلاین:

```bash
node scripts/catalog-import.mjs fixtures/catalog/sample-catalog.json
```

Checksum روی JSON با ترتیب کلید قطعی محاسبه می‌شود؛ Import تکراری با Unique `(tenant_id, checksum)` متوقف می‌شود.
