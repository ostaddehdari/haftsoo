# Role، Permission و Scope — S05-W02

مدل مجوز هفت‌سو `RBAC` با محدودیت Scope و تصمیم پیش‌فرض `deny` است. نقش‌ها بستهٔ قابل ممیزی از Permission هستند؛ مجوز مستقیم و پراکنده به کاربر داده نمی‌شود.

| نقش پایه | مرز مسئولیت |
|---|---|
| `guest` | خواندن آگهی عمومی |
| `member` | آگهی، پروفایل و چت خود کاربر |
| `business_owner` | آگهی‌های کسب‌وکار خودش |
| `moderator` | صف و تصمیم بررسی محتوا |
| `support_agent` | پرونده پشتیبانی و داده ماسک‌شده |
| `finance_operator` | دفترکل و تطبیق مالی |
| `platform_admin` | پیکربندی سامانه، IAM و Audit |
| `service` | فراخوانی داخلی سرویس‌ها |

Scopeهای پایه `self`، `business`، `tenant`، `assigned-queue` و `platform` هستند. نقش‌های ناظر محتوا/مدیر پلتفرم و اپراتور مالی/مدیر پلتفرم مشمول تفکیک وظایف‌اند. نقش‌های عملیاتی تفصیلی در `S26` توسعه می‌یابند.

کاتالوگ ماشین‌خوان در `security/authorization-catalog.json` و تابع تصمیم‌گیری Default-deny در `apps/api/src/security/security-core.ts` است.
