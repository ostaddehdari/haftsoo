# S12-W01 — Index و Mapping

Template نسخه‌دار `posts-v1` دارای Mapping سخت‌گیرانه در ریشه، سه Shard، Aliasهای مستقل خواندن/نوشتن، `geo_point`، Object کنترل‌شده برای فیلدهای پویا و Analyzer فارسی است. `npm run search:bootstrap` نصب اولیه را تکرارپذیر می‌کند. تغییر Mapping با ساخت Index جدید و جابه‌جایی اتمیک Alias منتشر می‌شود؛ Mutation مستقیم Mapping تولید مجاز نیست.
