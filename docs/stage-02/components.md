# S02-W05 — کتابخانه کامپوننت‌ها

منبع ماشینی: `design-system/component-manifest.json`.

هر کامپوننت قرارداد ثابت Props، Variant، State، رویداد، دسترس‌پذیری و تست تصویری دارد. Button و TextField کنترل پایه‌اند؛ SelectRow و PostCard الگوی دامنه؛ Modal و BottomSheet زیرساخت Overlay؛ Toast، Skeleton و EmptyState بازخورد؛ Header و BottomNavigation پوسته ناوبری هستند.

قواعد:

- کامپوننت دامنه API صدا نمی‌زند و داده آماده دریافت می‌کند.
- حالت loading ابعاد نهایی را حفظ می‌کند تا Layout Shift رخ ندهد.
- Disabled جایگزین Permission Denied نیست؛ دلیل ممنوعیت باید نمایش داده شود.
- تمام Actionها نام تحلیلی پایدار دارند و متن نمایشی شناسه رخداد نیست.
- Variant جدید بدون Story، Keyboard test و حالت تیره پذیرفته نمی‌شود.
