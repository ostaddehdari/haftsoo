# Threat Model و Data Flow — S05-W08

تحلیل STRIDE روی مرزهای Browser/Edge، Edge/Web، Web/API، API/Data، API/Chat و Workforce/Admin انجام شده است.

| STRIDE | سناریوی پایه | کنترل اصلی |
|---|---|---|
| Spoofing | Replay درخواست سرویس | HMAC، زمان و Nonce |
| Tampering | تغییر Audit | Hash chain، امضا و WORM |
| Repudiation | انکار تصمیم کارمند | Actor و Request ID |
| Information disclosure | دسترسی بین Tenant | Scope، Masking و Default-deny |
| Denial of service | سوءاستفاده از ورود/تماس | Rate limit، WAF و Backpressure |
| Elevation of privilege | دور زدن تخصیص نقش | تفکیک وظایف، Step-up و Audit |

Threat model با افزودن مرز اعتماد، پرداخت، داده حساس، Incident و حداقل هر فصل بازبینی می‌شود. جزئیات ماشین‌خوان در `security/threat-model.json` و `security/data-flow.json` است.
