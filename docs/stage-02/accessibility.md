# S02-W08 — خط مبنای دسترس‌پذیری

هدف: WCAG 2.2 سطح AA برای مسیرهای بحرانی.

- ساختار معنایی header/nav/main/aside/footer و یک H1 در هر صفحه.
- ترتیب Tab منطبق با ترتیب بصری، Focus قابل‌مشاهده و Skip link در ابتدای سند.
- کنتراست متن عادی ۴.۵:۱ و متن بزرگ ۳:۱؛ رنگ تنها نشانه وضعیت نیست.
- Label متصل برای همه ورودی‌ها، خطا با `aria-describedby` و اعلان async با live region.
- Dialog دارای role، نام، focus trap و بازگردانی focus؛ تصاویر معنادار alt فارسی دارند.
- Touch target حداقل ۴۴px، زوم مرورگر مسدود نمی‌شود و timeout قابل تمدید است.
- تست گیت: Keyboard-only، axe بدون critical، VoiceOver/TalkBack برای ورود، جست‌وجو، تماس و ثبت.
