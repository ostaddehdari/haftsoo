# S04-W07 — DNS، TLS، CDN و WAF

سیاست ماشین‌خوان Edge در `ops/edge/policy.json` ثبت است. ArvanCloud نقطه ورودی عمومی است؛ TLS حداقل 1.2، Redirect اجباری HTTPS، HSTS و Headerهای امنیتی فعال می‌شوند. HTML و API Cache نمی‌شوند و Assetهای Hash شده قابلیت Cache طولانی دارند.

Rate limit ورود از API عمومی سخت‌گیرانه‌تر است. مسیر Chat از WebSocket عبور می‌کند و Origin فقط درخواست‌های CDN/شبکه عملیاتی را می‌پذیرد. تغییر WAF ابتدا در حالت Log، سپس Challenge و در پایان Block فعال می‌شود تا False positive اندازه‌گیری شود.

فایل Nginx موجود فقط با Backup، `nginx -t`، درخواست Local `--resolve` و سپس درخواست Public تغییر می‌کند. نمونه S04 جایگزین خودکار تنظیم Production نیست.
