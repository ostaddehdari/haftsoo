# هفت‌سو

هفت‌سو بازارگاه آگهی سراسری و فارسی‌زبان با تجربه RTL، جست‌وجوی ساختاریافته، داده مکانی دقیق، چت امن و عملیات قابل ممیزی است.

## نصب و به‌روزرسانی

```bash
curl -fsSL https://raw.githubusercontent.com/ostaddehdari/haftsoo/main/install.sh | sudo bash
```

اگر Virtual Host خودکار تشخیص داده نشد:

```bash
curl -fsSL https://raw.githubusercontent.com/ostaddehdari/haftsoo/main/install.sh | \
  sudo env HAFTSOO_NGINX_VHOST=/etc/nginx/sites-enabled/unified-gateway bash
```

به‌روزرسانی نسخه نصب‌شده:

```bash
sudo bash /opt/haftsoo/scripts/update.sh
```

بررسی سلامت:

```bash
curl -fsS http://127.0.0.1:3100/healthz
docker compose -f /opt/haftsoo/compose.yaml ps
```

## وضعیت تحویل

- برنامه اجرایی: ۴۰ استیج، هر استیج دقیقاً ۱۰ ورک
- تکمیل‌شده: `S01 — منشور محصول` و `S02 — ممیزی UX و سیستم طراحی`
- استیج بعدی: `S03 — Monorepo و استانداردهای مهندسی`
- پشته مصوب: Nuxt 3، NestJS، Go، PostgreSQL/PostGIS، OpenSearch، Redis و Kafka
- Prototype: [https://srun.ir/haftsoo/](https://srun.ir/haftsoo/)

## خروجی استیج ۲

| ورک | خروجی |
|---|---|
| S02-W01 | ممیزی صفحه‌ها و حالت‌های UI |
| S02-W02 | Manifest مسیرها و Overlayها |
| S02-W03 | توکن‌های رنگ، فاصله، سطح و مرز |
| S02-W04 | تایپوگرافی فارسی، RTL و آیکون |
| S02-W05 | کتابخانه کامپوننت‌های پایه |
| S02-W06 | Breakpointها و Responsive |
| S02-W07 | Motion و Reduced Motion |
| S02-W08 | خط مبنای WCAG 2.2 AA |
| S02-W09 | Prototype تعاملی صفحات بحرانی |
| S02-W10 | گیت پذیرش سیستم طراحی |

## منابع کلیدی

- [ممیزی UI](docs/stage-02/ui-audit.md)
- [Route و Overlay](design-system/route-manifest.json)
- [توکن‌ها](design-system/tokens.json)
- [کامپوننت‌ها](design-system/component-manifest.json)
- [دسترس‌پذیری](docs/stage-02/accessibility.md)
- [پذیرش استیج ۲](docs/stage-02/acceptance.md)

## تأیید پروژه

```bash
npm run verify:all
```

این گیت خروجی‌های S01 و S02، نصب، ساختار JSON، Prototype، دسترس‌پذیری پایه و نبود الگوهای رایج Secret را کنترل می‌کند. هیچ رمز، Token، کلید SSH، فایل `.env` یا داده شخصی نباید وارد Git شود.
