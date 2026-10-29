# نقشه دامنه‌های هفت‌سو

## دامنه‌های هسته

1. **Listings**: آگهی، نسخه، وضعیت، ویژگی، تماس و ارتقا.
2. **Taxonomy & Forms**: دسته، فیلد پویا، گزینه، شرط و Validation.
3. **Search & Discovery**: Index، Query، Ranking، Suggestion و Saved Search.
4. **Geo**: استان، شهر، محله، Polygon، Viewport و Spatial Query.
5. **Trust & Safety**: Moderation، Report، Appeal، AI و ضدتکرار.

## دامنه‌های پشتیبان

- Identity & Account
- Media
- Chat & Presence
- Notifications
- Payments, Wallet & Ledger
- CRM & Support
- Analytics & Audit

## روابط مهم

- Listing به یک Category Version و Place Snapshot متصل است.
- فیلدهای آگهی با Schema Version ذخیره می‌شوند تا تغییر فرم تاریخچه را نشکند.
- Search مصرف‌کننده رویدادهای Listing است و منبع حقیقت نیست.
- Chat مالک Conversation و Message است؛ Listing فقط Context گفتگو را فراهم می‌کند.
- Ledger منبع حقیقت مالی است؛ نتیجه PSP بدون Journal معتبر، درآمد قطعی محسوب نمی‌شود.
- Moderation تصمیم و Reason Code را ثبت می‌کند و حذف فیزیکی مستقیم انجام نمی‌دهد.

## مرز اولیه Deployableها

تا قبل از اثبات نیاز عملیاتی، هسته NestJS به‌صورت Modular Monolith باقی می‌ماند. Chat از ابتدا Go مستقل است. Workerها قابل جداسازی‌اند. Search، Storage و Event Bus زیرساخت مشترک با قرارداد روشن هستند.

