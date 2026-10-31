# S06-W06 — Outbox و Inbox

Outbox و تغییر Aggregate باید در یک Unit of Work ثبت شوند. Publisher فقط ردیف‌های `published_at IS NULL` و `available_at <= now()` را با Index جزئی می‌خواند؛ بعد از Publish موفق، زمان انتشار و تعداد تلاش ثبت می‌شود.

Inbox با کلید `(consumer, event_id)` تحویل At-least-once را idempotent می‌کند. Claim تکراری با `ON CONFLICT DO NOTHING` رد می‌شود. Receiptها ۳۰ روز نگه‌داری اولیه دارند و Purge آن‌ها تنها طبق Policy مجاز است.

Payload شامل داده حساس یا Token نیست. Event دارای `event_type` و `event_version` است تا Consumerها Evolution قرارداد را کنترل کنند.
