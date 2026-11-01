# S14-W09 — Submit نهایی Idempotent

هر ارسال کلید `Idempotency-Key` پایدار دارد. Unique key ترکیبی tenant، actor و idempotency key باعث می‌شود retry همان `postId` را برگرداند. ایجاد Post، ثبت request، تغییر وضعیت Draft و Outbox Event در یک تراکنش Serializable انجام می‌شود.
