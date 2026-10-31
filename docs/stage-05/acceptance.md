# گیت خروج امنیت و IAM — S05-W10

استیج ۵ زمانی پذیرفته است که هر ده ورک کامل باشند و کنترل‌ها فقط مستند نباشند، بلکه در API و CI تست شوند.

## معیارهای پذیرش

- پنج نوع Principal و مرز Tenant ثبت شده است.
- Role/Permission/Scope با تصمیم پیش‌فرض Deny وجود دارد.
- Session rotation، reuse detection و Device trust تعریف شده است.
- Endpoint داخلی با HMAC، Timestamp، Allowlist و Nonce یک‌بارمصرف محافظت می‌شود.
- Headerهای امنیتی و CORS بدون wildcard با E2E Test تأیید می‌شوند.
- Tierهای Abuse control و Redis production store تعریف شده‌اند.
- Audit hash-chain دست‌کاری را تشخیص می‌دهد و مقصد Append-only/WORM است.
- هر شش دسته STRIDE پوشش دارند.
- `npm run verify:stage5`، `npm run security:baseline` و تست API موفق‌اند.
- هیچ Secret واقعی یا داده شخصی در Repository نیست.

## مرز تحویل

این استیج معماری و Primitiveهای پایه را می‌بندد. OTP و نشست کاربر در S18، RBAC عملیاتی کامل در S26 و Hardening نهایی در S36 تحویل می‌شوند. Prototype فعلی Production در این استیج جایگزین نمی‌شود.
