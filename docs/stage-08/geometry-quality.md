# S08-W03 — کیفیت و نرمال‌سازی هندسه

- مختصات WGS84/SRID 4326 و ترتیب GeoJSON برابر `[longitude, latitude]` است.
- مرز اصلی `MultiPolygon`، مرکز `Point geography`، محدوده `bbox Polygon` و نسخهٔ سبک نقشه `boundary_simplified` است.
- Trigger با `ST_MakeValid`، `ST_Force2D`، `ST_CollectionExtract` و `ST_Multi` ورودی را نرمال می‌کند.
- `ST_SimplifyPreserveTopology` مرز سبک، `ST_Envelope` محدوده و `ST_PointOnSurface` مرکز امن داخل مرز را می‌سازد.
- محله بدون Polygon پذیرفته نمی‌شود؛ Ring باز، مختصات نامعتبر، مرکز خارج ایران و شناسهٔ تکراری پیش از Import رد یا گزارش می‌شود.

هندسهٔ منبع برای ممیزی حفظ می‌شود و ساده‌سازی جایگزین مرز دقیق نیست.
