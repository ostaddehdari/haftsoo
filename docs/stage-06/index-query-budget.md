# S06-W08 — Index و Query Budget

بودجه ماشین‌خوان در `database/query-budget.json` است: P95 تعاملی ۲۰۰ms، مکانی ۵۰۰ms و Job پس‌زمینه ۲۰۰۰ms. Query تعاملی حداکثر ۱۰۰ ردیف و Statement timeout پیش‌فرض ۱ ثانیه دارد.

Baseline شامل Index فعال Resource، Outbox منتشرنشده، Aggregate، Inbox expiry و Tenant/time است. Query مکانی آینده باید Bounding box و GiST داشته باشد. Query جدید پیش از Merge با `EXPLAIN (FORMAT JSON)` بازبینی می‌شود و `ANALYZE` فقط خارج Production اجرا می‌شود.

Sequential scan روی داده زیاد، Pagination نامحدود، `SELECT *` در Repository و Sort بدون Index گیت را رد می‌کند.
