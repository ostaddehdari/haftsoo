# تست‌های امنیتی خط مبنا — S05-W09

گیت امنیتی Stage 5 شامل موارد زیر است:

- Default-deny و الزام Scope در Authorization؛
- مرزهای Allow/Step-up/Deny در Device trust؛
- HMAC معتبر، انقضای Timestamp و رد Replay؛
- Sliding window و Retry guidance؛
- تشخیص دست‌کاری Audit chain؛
- تست واقعی Nest/Fastify برای Header، CORS و مسیر محافظت‌شده؛
- اسکن سیاست‌های ماشین‌خوان برای wildcard، Cookie ناامن و پوشش STRIDE؛
- تست چرخه Secret و Compose بدون قرار گرفتن مقدار Secret در Git.

فرمان مستقل `npm run security:baseline` و گیت کامل `bash scripts/build-stage-05.sh` است. Hardening عمیق، DAST و Pentest انتشار در `S36` انجام می‌شود.
