# S04-W10 — گیت خروج Staging و بازیابی

استیج ۴ زمانی پذیرفته است که:

- سه Topology ماشین‌خوان و مرزبندی داده‌ها ثبت شده باشد.
- Ansible و Compose از نظر Syntax/Configuration معتبر باشند.
- Imageهای سه Deployable با Tag تغییرناپذیر قابل انتشار باشند.
- PostGIS، Redis، Kafka، OpenSearch و Object storage در شبکه داخلی تعریف شده باشند.
- Secret lifecycle آزمون شده و هیچ مقدار Runtime در Git نباشد.
- سیاست Edge، Backup/PITR و Capacity قابل ممیزی باشد.
- Recovery Drill خودکار PostGIS با Restore و بررسی داده موفق شود.
- ده Work در `project.state.json` دارای Evidence باشند.
- CI روی Commit نهایی سبز و Commit SHA با GitHub تطبیق داده شود.

گیت این استیج، Staging یک‌بارمصرف و Recovery واقعی را تأیید می‌کند. مهاجرت Production از Prototype به Stack جدید بخشی از این Deploy نیست؛ این جداسازی از قطعی سرویس فعال جلوگیری می‌کند.
