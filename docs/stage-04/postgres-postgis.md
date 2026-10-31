# S04-W04 — PostgreSQL و PostGIS

PostgreSQL مرجع تراکنشی و PostGIS مرجع هندسه شهر، محله، نقطه آگهی و جست‌وجوی مکانی است. Staging از PostGIS 17/3.5 استفاده می‌کند؛ Production باید Managed، Multi-AZ، دارای PITR و Replica خواندنی باشد.

قواعد عملیاتی:

- مختصات جغرافیایی با SRID 4326 و Index از نوع GiST ذخیره می‌شود.
- Migration فقط Forward و با Lock budget محدود اجرا می‌شود.
- Connection pool برای API اجباری و اتصال مستقیم Client ممنوع است.
- Role برنامه DDL ندارد؛ Role مهاجرت جداگانه است.
- Autovacuum، رشد Storage، Replica lag و Transactionهای طولانی Alert دارند.
- Backup بدون آزمون Restore «معتبر» محسوب نمی‌شود.

اسکریپت `recovery-drill.sh` Extension مکانی، Dump، بازسازی Database و صحت داده را در Container یک‌بارمصرف آزمایش می‌کند.
