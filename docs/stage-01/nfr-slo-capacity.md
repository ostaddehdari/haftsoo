# NFR، SLO و ظرفیت هدف

## SLO اولیه

| سرویس | شاخص | هدف |
|---|---|---|
| Web/API | Availability | 99.9% ماهانه |
| API عمومی | Latency | p95 < 500ms برای خواندن ساده |
| Search | Latency | p95 < 700ms |
| Map Viewport | Latency | p95 < 900ms |
| Chat | Online delivery | p95 < 1s |
| Media | Upload success | > 99% بدون خطای کاربر |
| Notification | Dispatch | p95 < 60s برای پیام غیراضطراری |
| Payment webhook | Processing | p95 < 5s و idempotent |

## امنیت و حریم خصوصی

- TLS اجباری، Encryption at Rest برای داده حساس و حداقل دسترسی.
- Audit برای عملیات ادمین، Moderation و مالی.
- عدم ثبت OTP، Token، Secret و متن کامل PII در Log.
- Rate Limit چندسطحی بر IP، Device، Account و Action.

## ظرفیت مبنا برای طراحی

- ۱۰۰ هزار کاربر فعال روزانه در افق V1.
- ۵ میلیون آگهی فعال قابل Index.
- ۱۰۰۰ درخواست خواندن در ثانیه در پیک طراحی.
- ۲۰۰ پیام چت در ثانیه با امکان Scale افقی.
- ۵۰ هزار Upload روزانه با پردازش Async.

این اعداد تعهد تجاری نیستند؛ ورودی طراحی و Load Test هستند و با داده واقعی بازتنظیم می‌شوند.

