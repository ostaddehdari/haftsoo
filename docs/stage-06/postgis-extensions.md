# S06-W02 — PostGIS و Extensionها

Migration اول به‌صورت idempotent این Extensionها را فعال می‌کند:

| Extension | کاربرد |
|---|---|
| `postgis` | Geometry، Geography، GiST و عملیات مکانی |
| `pgcrypto` | UUID امن سمت سرور |
| `citext` | Slug و شناسه متنی بدون حساسیت به حروف |
| `btree_gist` | Constraint و Indexهای ترکیبی آینده |

نسخه Container مرجع `postgis/postgis:17-3.5-alpine` است. Drill بازیابی وجود PostGIS را در پایگاه Restoreشده با `PostGIS_Version()` اثبات می‌کند.
