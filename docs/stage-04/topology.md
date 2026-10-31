# S04-W01 — توپولوژی محیط‌ها

سه محیط از یک قرارداد مشترک پیروی می‌کنند و فقط سطح پایداری و شیوه تأمین منابع متفاوت است. تعریف ماشین‌خوان در `infra/environments` مرجع اصلی است.

| محیط | کاربرد | اجرا | داده | دسترسی |
|---|---|---|---|---|
| Development | بازخورد سریع توسعه‌دهنده | Docker Compose محلی | Container موقت | فقط Localhost |
| Staging | اعتبارسنجی Release و Restore | Compose تک‌گره‌ای | داده ایزوله و قابل حذف | شبکه خصوصی/TLS |
| Production | بار عمومی بازارگاه | سرویس مدیریت‌شده یا Orchestrator چندگره‌ای | Multi-AZ و Versioned | ArvanCloud CDN/WAF |

هیچ داده، Token یا Cookie تولید در محیط‌های پایین‌تر کپی نمی‌شود. Artifact یک Commit در همه محیط‌ها یکسان است و فقط Configuration تغییر می‌کند. Promotion از Development به Staging و سپس Production انجام می‌شود؛ Rollback با Image digest قبلی است.
