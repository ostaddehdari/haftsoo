# S08-W09 — تست و مشاهده‌پذیری GIS

Unit test قرارداد Fixture، Checksum، درخت، تبدیل Polygon، bbox، نقطه در Polygon و Hole، Cycle، Ring باز و شناسهٔ تکراری را پوشش می‌دهد. Contract test حضور PostGIS types، GiST، RLS، نرمال‌سازی، API و Spatial Query را کنترل می‌کند. Recovery drill همه Migrationها را روی PostGIS واقعی اعمال و Restore می‌کند.

رویدادهای Import/Publish دارای Release ID و Checksum هستند. معیارهای عملیاتی هدف: زمان Validate/Import، تعداد هندسهٔ نامعتبر، تعداد Warning، اندازهٔ Full/Simplified، p95 جست‌وجو/Resolve و Hit ratio Cache.
