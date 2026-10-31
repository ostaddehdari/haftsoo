# S08-W04 — قرارداد Import جغرافیا

قرارداد JSON نسخهٔ ۱ شامل `source` و آرایهٔ `places` است. هر مکان کلید، نوع، slug، نام، والد، مرکز اختیاری، Polygon/MultiPolygon اختیاری و شناسه‌های Provider دارد. برای محله Boundary الزامی است.

`node scripts/geo-import.mjs <file>` بررسی آفلاین و SHA-256 پایدار می‌دهد. بررسی کامل API علاوه بر Schema، نوع والد، Cycle، عمق، Ring بسته، WGS84، محدوده ایران، مرکز داخل مرز و یکتایی Provider ID را کنترل می‌کند. Fixture مخزن هندسهٔ مصنوعی است و دادهٔ رسمی کشور محسوب نمی‌شود.
