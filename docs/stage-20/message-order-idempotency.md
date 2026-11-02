# S20-W05 — ترتیب، دوام و idempotency پیام

هر ارسال `clientMessageId` اجباری دارد. کلید `(tenant, conversation, sender, clientMessageId)` از ارسال دوباره پس از reconnect جلوگیری می‌کند و همان پیام قبلی را برمی‌گرداند.

شماره sequence در تراکنش مکالمه افزایش می‌یابد. migration پیام‌ها را ماهانه partition می‌کند و جدول idempotency به شناسه و زمان partition پیام اشاره دارد. انتشار `message.created` فقط برای درج تازه انجام می‌شود.
