# Audit Trail غیرقابل‌انکار — S05-W07

هر رخداد امنیتی Actor، Action، Resource، Request ID، Outcome و زمان UTC دارد. رکوردها با SHA-256 به رکورد پیشین زنجیر و با کلید مستقل HMAC امضا می‌شوند؛ هر تغییر در رویداد یا ترتیب زنجیره قابل تشخیص است.

Audit نباید Secret، بدنه کامل درخواست یا شماره تلفن خام ذخیره کند. مقصد Production Append-only است و نسخه آرشیوی WORM با نگهداری هفت‌ساله دارد. کلید Audit از `AUDIT_SIGNING_KEY_FILE` تأمین و جدا از کلید نشست نگهداری می‌شود.

این استیج Primitive تولید و اعتبارسنجی زنجیره را تحویل می‌دهد. Persistence، Partition و Export آرشیوی همراه مدل داده در استیج‌های بعد اجرا می‌شود.

سیاست: `security/audit-policy.json`.
