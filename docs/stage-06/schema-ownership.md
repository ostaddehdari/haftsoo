# S06-W03 — Schema و مرزبندی مالکیت

مالکیت رسمی در `database/ownership.json` ثبت شده است. Schemaهای `platform`، `identity`، `catalog`، `geo`، `listing`، `messaging`، `finance`، `moderation` و `audit` مرز نوشتن سرویس‌ها هستند.

قواعد:

1. هر سرویس فقط در Schema متعلق به خود می‌نویسد.
2. ارتباط بین مرزها با ID پایدار و Event نسخه‌شده انجام می‌شود.
3. Foreign key بین سرویس‌های مستقل اضافه نمی‌شود؛ Foreign key داخل یک مرز مجاز است.
4. `platform` فقط Primitiveهای مشترک Tenant، Outbox، Inbox و Archive را نگه می‌دارد.
5. جدول‌های محصول در استیج مالک همان دامنه ساخته می‌شوند؛ S06 جدول عمومی و مبهم محصول ایجاد نمی‌کند.
