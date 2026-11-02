# ارسال و Idempotency

کلید `tenant + user + dedupe_key` از اعلان تکراری و کلید تحویل از ارسال دوباره جلوگیری می‌کند. Worker رکوردها را با `FOR UPDATE SKIP LOCKED` claim می‌کند.
