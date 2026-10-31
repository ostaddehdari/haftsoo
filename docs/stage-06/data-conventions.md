# S06-W01 — قرارداد پایه داده

قرارداد اجرایی در `database/conventions.json` مرجع واحد Naming، شناسه، زمان، حذف نرم، Tenant و مختصات است.

- کلید اصلی UUID و تولید در PostgreSQL با `gen_random_uuid()` است.
- تمام زمان‌ها `timestamptz` و در UTC ذخیره می‌شوند؛ نمایش در `Asia/Tehran` است.
- رکوردهای کسب‌وکاری `created_at`، `updated_at` و `deleted_at` دارند.
- نام پایگاه داده `snake_case` و نام API `camelCase` است.
- ترتیب GeoJSON برابر `[longitude, latitude]` و SRID برابر 4326 است.
- Queryهای فعال باید صریحاً `deleted_at IS NULL` داشته باشند.
