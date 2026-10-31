# S08-W02 — چرخهٔ Release جغرافیا

هر Tenant مجموعه جغرافیایی نسخه‌شده با وضعیت `draft/published/retired` دارد. Import همیشه Draft جدید با Checksum قطعی می‌سازد. Publish در تراکنش Serializable نسخهٔ قبلی را Retire و نسخهٔ منتخب را Published می‌کند؛ Index شرطی فقط یک نسخهٔ Published را مجاز می‌داند.

خواندن عمومی فقط Release منتشرشده را می‌بیند. Import یا Publish رویداد Outbox تولید می‌کند تا Cache، Search و مصرف‌کنندگان نقشه بدون Dual Write هماهنگ شوند.
