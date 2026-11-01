# پذیرش استیج ۱۵

- PUT امضاشده Tenant-scoped با SHA-256 و TTL حداکثر ۱۵ دقیقه است.
- تصویر و ویدیو derivative مشخص و EXIF تصویر حذف می‌شود.
- Malware، AI Safety و تکرار همان‌روز قبل از Ready کنترل می‌شوند.
- RLS، کاور یکتا، ترتیب پایدار، retry و cleanup در Schema ثبت شده‌اند.
- UI آپلود، پیشرفت، پردازش، خطا، حذف و کاور را نمایش می‌دهد.
- Submit تا پایان پردازش همهٔ رسانه‌های غیرحذف‌شده با خطای `media_not_ready` متوقف می‌شود.
- Migration رفت و برگشت، Contract، Unit test و CI سبز هستند.
