# S20-W10 — پذیرش استیج ۲۰

استیج زمانی کامل است که ۱۰ مدرک، قرارداد chat، migration برگشت‌پذیر، بلیت HMAC، WebSocket واقعی، HTTP fallback، idempotency، sequence، receipt، presence، block/report و RLS موجود باشند.

CI علاوه بر آزمون‌های Node، `gofmt -l`، `go test -race ./...` و build سرویس را اجرا می‌کند. هیچ کلید امضا در مخزن ذخیره نمی‌شود و image چت به صورت non-root ساخته می‌شود.
