# S20-W09 — ماندگاری، ظرفیت و مشاهده‌پذیری

migration شماره ۱۳ جداول مکالمه، مشارکت‌کننده، پیام partition‌شده، idempotency، block و report را با tenant RLS می‌سازد. query budget چت P95 نوشتن ۱۲۰ms، صفحه مکالمه ۱۸۰ms و صفحه پیام حداکثر ۱۰۰ ردیف است.

نسخه هسته فعلی Store port دارد و MemoryStore فقط برای تست و توسعه است؛ PostgreSQL منبع حقیقت محیط اجرایی است و Redis/Kafka به‌ترتیب برای حضور و fan-out بین replicaها استفاده می‌شوند.
