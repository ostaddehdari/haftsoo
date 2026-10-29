# S02-W04 — تایپوگرافی فارسی، RTL و آیکون

## تایپوگرافی

Fallback رسمی: `Vazirmatn, IRANSansX, Tahoma, Arial, sans-serif`. محصول در این مرحله فونت خارجی بارگیری نمی‌کند. وزن‌های مجاز ۴۰۰، ۵۰۰ و ۷۰۰ و اندازه‌های متنی ۱۲ تا ۳۲px هستند. متن بدنه line-height برابر ۱.۸ دارد.

## RTL

- سند `lang=fa` و `dir=rtl` است.
- شماره تلفن، شناسه، مختصات و کد OTP با `dir=ltr` و `unicode-bidi:isolate` نمایش داده می‌شوند.
- CSS از inline/block و start/end استفاده می‌کند؛ چپ/راست فقط برای داده مکانی مجاز است.
- اعداد ذخیره‌شده لاتین‌اند و قالب نمایشی فارسی در لایه Presentation انجام می‌شود.

## آیکون

آیکون‌ها SVG خطی ۲۴px با `currentColor` هستند. آیکون تزئینی `aria-hidden=true` و آیکون تنها در دکمه نیازمند `aria-label` است. Emoji و icon-font در UI محصول ممنوع‌اند.
