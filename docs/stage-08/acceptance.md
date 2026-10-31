# S08-W10 — پذیرش جغرافیا، شهر و محله

وضعیت S08 پس از سبزشدن گیت‌ها: **پذیرفته‌شده**.

| کنترل | شاهد | نتیجه |
|---|---|---|
| ۱۰ ورک | `project.state.json` | کامل |
| سلسله‌مراتب و Cycle guard | Migration 000004 و Core test | کامل |
| Release lifecycle | Unique Published و Repository | کامل |
| Polygon/MultiPolygon 4326 | Schema، Trigger و Fixture | کامل |
| مرکز، bbox و Simplified | PostGIS Trigger | کامل |
| شناسه‌های مستقل Provider | `geo.place_identifiers` | کامل |
| API عمومی و GeoJSON | Geo controller | کامل |
| Resolve/Search فضایی | GiST، Trigram و `ST_Covers` | کامل |
| Import/Publish امن | Admin controller، RLS و Outbox | کامل |
| CI/Docs/Secret review | Stage verifier | کامل |

گیت محلی `bash scripts/build-stage-08.sh` است. Fixture صرفاً تست مصنوعی است؛ دادهٔ کامل کشور باید از مسیر Import کنترل‌شده، دارای مجوز و Checksum بارگذاری شود.
