# Rate Limit و Abuse Control — S05-W06

محدودسازی بر چهار بعد Principal، Device، IP و Route طراحی شده و برای مسیرهای عمومی، ورود، نمایش اطلاعات تماس و سرویس داخلی Tier مستقل دارد. پاسخ رد شده `429` و `Retry-After` است.

پیاده‌سازی این استیج یک Sliding Window قطعی برای Process منفرد و تست‌های پایه است. شرط فعال‌سازی چند Replica در Production، Redis با Script اتمیک، کلیدهای نسخه‌شده، TTL و Fail mode مخصوص هر Route است. مسیرهای مالی و ورود Fail-closed و مسیرهای خواندنی کم‌خطر با محدودیت Edge دفاع تکمیلی خواهند داشت.

سیاست ماشین‌خوان: `security/rate-limit-policy.json`.
