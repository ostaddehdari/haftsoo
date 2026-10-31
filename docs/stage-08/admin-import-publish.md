# S08-W08 — عملیات مدیریتی Import و Publish

مسیرهای `POST /v1/admin/geo/validate`, `POST /v1/admin/geo/imports` و `POST /v1/admin/geo/releases/:id/publish` تحت Service Authentication هستند. Validate هیچ تغییری ایجاد نمی‌کند؛ Import معتبر یک Draft و گزارش کیفیت می‌سازد؛ Publish اتمیک است.

فایل ورودی، License، Attribution، زمان تولید، Checksum، Actor و شمارش کیفیت ثبت می‌شوند. دادهٔ دارای خطا Publish نمی‌شود و Token، Cookie، شماره تماس یا پاسخ خصوصی منابع در Fixture و Log ذخیره نمی‌شود.
