# S08-W05 — ذخیره‌سازی و Index فضایی

چهار جدول `geo.releases`, `geo.places`, `geo.place_identifiers`, `geo.import_jobs` با RLS اجباری Tenant ساخته شده‌اند. GiST روی مرکز و مرزها، GIN Trigram روی نام، GIN روی Alias و B-tree روی درخت و نوع قرار دارد.

Repository فقط Query پارامتری اجرا می‌کند. Query نقطه ابتدا با عملگر bbox (`&&`) کاندیداها را محدود و بعد با `ST_Covers` پوشش دقیق را بررسی می‌کند. نتیجه از عمیق‌ترین و کوچک‌ترین محدوده مرتب می‌شود.
