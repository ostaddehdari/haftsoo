# S09-W03 — Decode کردن Polyline

`decodePolyline` الگوریتم Google Encoded Polyline را با precision پیش‌فرض ۵ اجرا می‌کند و خروجی را برای GeoJSON به ترتیب `[longitude, latitude]` می‌سازد. هر ۲۶۹۵ رشته با حلقهٔ ذخیره‌شده مقایسه می‌شود؛ هر اختلاف یا دادهٔ ناقص build را متوقف می‌کند.
