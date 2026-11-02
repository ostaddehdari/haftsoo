# S20-W04 — WebSocket بلادرنگ

مسیر `GET /v1/chat/ws` handshake استاندارد RFC 6455، Origin allowlist، frame ماسک‌شده client، سقف frame و deadline خواندن/نوشتن را اعمال می‌کند. فرمان‌های نسخه ۱ شامل `send_message`، `seen`، `typing` و `ping` هستند.

پاسخ اتصال `connection.ready` است و خطاهای پروتکل بدون افشای جزئیات داخلی با code پایدار ارسال می‌شوند. HTTP fallback برای ایجاد پیام و بازیابی تاریخچه حفظ شده است.
