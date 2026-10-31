# S03-W04 — اسکلت سرویس چت Go

سرویس `services/chat` فقط از کتابخانه استاندارد Go 1.24 استفاده می‌کند و شامل Timeout، خاموش‌شدن Graceful و Healthcheck مستقل است.

Endpointهای پایه:

- `GET /healthz`
- `GET /v1/chat/info`

WebSocket، ذخیره پیام، Presence، صف Outbox و کنترل Spam در استیج‌های چت اضافه می‌شوند. این مرزبندی از ابتدا اجازه می‌دهد بار بلادرنگ مستقل از API هسته Scale شود.
