# هفت‌سو

هفت‌سو یک بازارگاه آگهی سراسری و فارسی‌زبان است که با تمرکز بر تجربهٔ RTL، جست‌وجوی ساختاریافته، دادهٔ مکانی دقیق، چت امن و عملیات قابل ممیزی طراحی می‌شود.

## وضعیت پروژه

- برنامه اجرایی: ۴۰ استیج، هر استیج دقیقاً ۱۰ ورک
- استیج جاری: `S01 — منشور محصول و حاکمیت پروژه`
- پشتهٔ مصوب: Nuxt 3، NestJS، Go، PostgreSQL/PostGIS، OpenSearch، Redis و Kafka
- مقصد عمومی: `https://srun.ir/haftsoo/`
- مخزن: `ostaddehdari/haftsoo`

## خروجی استیج ۱

| ورک | خروجی |
|---|---|
| S01-W01 | چشم‌انداز، دامنه و KPIها |
| S01-W02 | ذی‌نفعان و RACI |
| S01-W03 | نقشه دامنه‌های کسب‌وکار |
| S01-W04 | مرز حقوقی و فنی الگوبرداری |
| S01-W05 | MVP و نسخه‌های بعدی |
| S01-W06 | NFR، SLO و ظرفیت هدف |
| S01-W07 | ADR و دفتر تصمیم‌ها |
| S01-W08 | رجیستر ریسک و پاسخ |
| S01-W09 | Epicها و Outcomeها |
| S01-W10 | گیت پذیرش خط مبنا |

## اسناد کلیدی

- [خط مبنای محصول](docs/stage-01/product-baseline.md)
- [حاکمیت و RACI](docs/stage-01/governance-raci.md)
- [نقشه دامنه‌ها](docs/stage-01/domain-map.md)
- [مرزهای حقوقی و فنی](docs/stage-01/legal-boundaries.md)
- [NFR و SLO](docs/stage-01/nfr-slo-capacity.md)
- [ریسک‌ها](docs/stage-01/risk-register.md)
- [Epicها و Outcomeها](docs/stage-01/epics-outcomes.md)
- [پذیرش استیج ۱](docs/stage-01/acceptance.md)

## تأیید استیج ۱

```bash
npm run verify:stage1
```

این دستور وجود همه خروجی‌ها، اعتبار JSONها، تعداد دقیق ۱۰ ورک، نبود الگوهای رایج Secret و تنظیم مقصد استقرار را بررسی می‌کند.

## سیاست امنیت

هیچ رمز، Token، کلید SSH، فایل `.env` یا دادهٔ شخصی نباید وارد Git شود. تنظیمات مقصد سرور فقط شامل داده‌های غیرمحرمانه است.

