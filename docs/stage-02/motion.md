# S02-W07 — Motion

| توکن | زمان | کاربرد |
|---|---:|---|
| instant | ۰ms | تغییر بدون واسطه |
| fast | ۱۲۰ms | hover، focus، رنگ |
| normal | ۲۴۰ms | modal، sheet، accordion |
| slow | ۳۶۰ms | ورود صفحه و آموزش |

Easing استاندارد `cubic-bezier(.2,0,0,1)` است. Motion باید علت و مقصد را روشن کند؛ انیمیشن تزئینی مداوم ممنوع است. Skeleton فقط opacity/gradient دارد و باعث reflow نمی‌شود.

در `prefers-reduced-motion: reduce` مدت‌ها صفر، smooth scroll خاموش و transformهای بزرگ حذف می‌شوند. هیچ اطلاعاتی فقط با حرکت منتقل نمی‌شود.
