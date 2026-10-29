# رجیستر ریسک استیج ۱

امتیاز ریسک برابر احتمال × اثر در مقیاس ۱ تا ۵ است.

| شناسه | ریسک | امتیاز | پاسخ | مالک |
|---|---|---:|---|---|
| R-001 | شباهت حقوقی/برندی با رقبا | 20 | طراحی مستقل و گیت Legal | Product/Legal |
| R-002 | نقص Polygon یا انتساب محله | 16 | Geometry validation و گزارش پوشش | Geo |
| R-003 | آگهی تکراری و شبکه تقلب | 20 | سیگنال متن/تصویر/Device و Human Review | Trust |
| R-004 | هزینه کنترل‌نشده SMS/AI | 12 | Budget، Quota و Multi-provider routing | FinOps |
| R-005 | وابستگی به PSP/BNPL | 15 | Adapter، Failover و Reconciliation | Payments |
| R-006 | افشای PII/Secret | 25 | Encryption، RBAC و Secret Scan | Security |
| R-007 | افت Search/Map در پیک | 16 | Load Test، Cache و Query Budget | Search/Geo |
| R-008 | Microservice زودهنگام | 12 | Modular Monolith و Extraction Criteria | Architecture |

ریسک با امتیاز ۲۰ یا بیشتر بدون Owner، Due Date و گزارش دوره‌ای اجازه عبور از گیت مرتبط را ندارد.

