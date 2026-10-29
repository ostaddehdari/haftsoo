# حاکمیت و ماتریس RACI

## نقش‌ها

- Sponsor: تصویب بودجه، دامنه و Go/No-Go.
- Product Director: مالک Outcome، Backlog و پذیرش محصول.
- Architecture Lead: مالک مرز دامنه، ADR و کیفیت فنی.
- Engineering Leads: Frontend، Backend، Realtime، Data و Platform.
- Trust & Safety: مالک سیاست محتوا، تقلب و Appeal.
- Finance/Legal: مالک کنترل مالی، قرارداد و الزامات حقوقی.
- QA/Release: مالک گیت‌ها، تست، شواهد و Release.

## RACI سطح کلان

| تصمیم/خروجی | Sponsor | Product | Architecture | Engineering | Trust | Finance/Legal | QA/Release |
|---|---|---|---|---|---|---|---|
| دامنه و KPI | A | R | C | C | C | C | I |
| معماری و ADR | I | C | A/R | R | C | C | C |
| سیاست محتوا | I | C | C | C | A/R | C | C |
| پرداخت و دفترکل | I | C | C | R | C | A/R | C |
| امنیت و حریم خصوصی | I | C | A | R | R | C | C |
| پذیرش استیج | I | A | C | R | C | C | R |
| عرضه تولید | A | R | C | R | C | C | R |

## قاعده تصمیم

هر تصمیم غیرقابل بازگشت یا پرهزینه باید ADR داشته باشد. تغییر دامنه یا KPI بدون ثبت Decision و اثر بر برنامه ۴۰ استیجی مجاز نیست.

