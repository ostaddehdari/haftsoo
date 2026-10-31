# S04-W06 — Secret و Rotation

در Development و Staging، Adapter فایل‌محور Docker Secrets استفاده می‌شود. `manage-secrets.sh` فایل‌ها را با `umask 077`، نوشتن اتمیک و Mode برابر `0600` می‌سازد. Production باید External Secret Manager، Audit log و دسترسی مبتنی بر هویت Workload داشته باشد.

چرخه Rotation:

1. ایجاد Version جدید بدون حذف Version قبل.
2. به‌روزرسانی Consumer و Health check.
3. بررسی Login/Signature با مقدار جدید.
4. لغو مقدار قبلی پس از Grace period.
5. ثبت Actor، زمان، Scope و نتیجه.

Secretهای Database باید با کاربر Dual credential و Secret امضای Session با Key ring چرخانده شوند. خروجی Command، Log و Ticket نباید مقدار Secret را نمایش دهد.
