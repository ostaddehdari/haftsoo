# S09-W07 — API سلسله‌مراتب مکانی

`GET /v1/geo/places` فرزندان مستقیم را برای selector برمی‌گرداند. `GET /v1/geo/hierarchy?provinceKey=...` شهرها، شمار محله و وضعیت مرز محله‌ها را تجمیع می‌کند. پاسخ version، ETag و cache policy release جغرافیایی را دارد و tenant از header دریافت می‌شود.
