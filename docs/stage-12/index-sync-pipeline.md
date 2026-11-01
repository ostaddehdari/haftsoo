# S12-W02 — Pipeline همگام‌سازی

Projection آگهی از Outbox با کلید پایدار `post_id` به Bulk API ارسال می‌شود. Upsert و Delete تکرارپذیرند، Batch دارای خطای جزئی شکست کامل تلقی می‌شود و Offset فقط پس از تأیید همه اقلام در `search.index_checkpoints` جلو می‌رود. هدف Freshness صدک ۹۵ کمتر از ۳۰ ثانیه است.
