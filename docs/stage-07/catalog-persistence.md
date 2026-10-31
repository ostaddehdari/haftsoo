# S07-W05 — ماندگاری و جداسازی Tenant

Migration `000003_catalog_taxonomy` هفت جدول Release، Category، Field، Option، Assignment، Rule و Import job را ایجاد می‌کند. تمام جدول‌ها RLS اجباری دارند و Tenant از Session تراکنش خوانده می‌شود.

Indexهای درخت، Slug فعال، Keyword، ترتیب فرم، گزینه و Rule، Queryهای اصلی را پوشش می‌دهند. Migration دارای Down متناظر است و در Recovery drill استیج ۶ نیز اعمال و برگردانده می‌شود.
