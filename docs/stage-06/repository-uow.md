# S06-W05 — Repository، Transaction و Unit of Work

`PostgresUnitOfWork` یک Connection اختصاصی می‌گیرد، Isolation را از Allowlist تنظیم می‌کند، Tenant و Statement timeout را با Parameter ثبت می‌کند و Commit/Rollback/Release قطعی دارد.

Repositoryها SQL پارامتری اجرا می‌کنند و همان Client تراکنش را دریافت می‌کنند. `ResourceRegistryRepository` قرارداد حذف نرم را رعایت می‌کند. تست‌ها Commit، Rollback، Timeout، Tenant validation و جلوگیری از ساخت SQL با ورودی کاربر را پوشش می‌دهند.

در Nest، `DatabaseModule` یک Pool مشترک و Unit of Work را Export می‌کند و Pool را هنگام Shutdown می‌بندد. ساخت Pool باعث اتصال زودهنگام نمی‌شود، بنابراین Health فرایند از Availability دیتابیس مستقل می‌ماند و Readiness بعداً جدا خواهد بود.
