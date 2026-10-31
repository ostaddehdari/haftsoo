# احراز هویت سرویس‌به‌سرویس — S05-W04

فراخوانی داخلی حساس با HMAC-SHA256 روی درخواست Canonical محافظت می‌شود. ورودی امضا نام سرویس، Method، Path، Timestamp و Nonce است. سرور موارد زیر را پیش از پذیرش بررسی می‌کند:

1. سرویس در Allowlist باشد؛
2. اختلاف ساعت بیشتر از ۶۰ ثانیه نباشد؛
3. Nonce حداقل ۱۶ کاراکتر و یک‌بارمصرف باشد؛
4. امضا با `timingSafeEqual` مقایسه شود؛
5. کلید فقط از Secret file خوانده شود.

مسیر خط مبنا فقط `GET /api/v1/security/service-auth-check` است. پیش از ایجاد مسیر داخلی غیر Idempotent، Digest بدنه باید به Canonical request افزوده شود. در Production، mTLS هدف نهایی دفاع چندلایه است و Replay store از حافظه به Redis اتمیک منتقل می‌شود.

پیاده‌سازی در `ServiceAuthGuard` و سیاست در `security/service-auth-policy.json` قرار دارد.
