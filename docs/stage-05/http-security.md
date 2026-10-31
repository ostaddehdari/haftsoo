# Security Header و CORS — S05-W05

API به‌صورت پیش‌فرض CSP محدود، جلوگیری از MIME sniffing، منع Frame، Referrer خاموش، CORP و Cache-Control خصوصی را برمی‌گرداند. Origin مجاز از `CORS_ALLOWED_ORIGINS` خوانده می‌شود و wildcard ممنوع است.

پیش‌فرض Production فقط `https://srun.ir` است. Staging مقدار مستقل دارد. درخواست بدون Origin برای سرویس و ابزار داخلی مجاز است، اما Origin مرورگر خارج Allowlist رد می‌شود. Cookie احراز هویت تنها با Origin صریح و Credentials ارسال می‌شود.

سیاست: `security/http-policy.json`. پیاده‌سازی: `SecurityHeadersInterceptor` و `configureHttpSecurity`.
