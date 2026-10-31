# S08-W01 — دامنهٔ سلسله‌مراتب جغرافیایی

مدل هفت‌سو هفت نوع مکان `country → province → county → district → rural_district` و مسیر شهری `county|district → city → neighborhood` را پشتیبانی می‌کند. `external_key` کلید پایدار داخلی Release است و `parent_id`، `depth` و Guard پایگاه‌داده از Cycle، والد نامعتبر و عبور از عمق ۸ جلوگیری می‌کنند.

شناسهٔ سرویس‌های بیرونی هویت داخلی نیست. هر شناسهٔ ملی، دیوار یا تأمین‌کنندهٔ آینده در `geo.place_identifiers(provider, external_id)` ذخیره می‌شود؛ بنابراین تغییر منبع داده به URL و شناسه‌های یک فروشنده وابسته نیست.
