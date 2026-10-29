# هفت‌سو

هفت‌سو یک بازارگاه آگهی سراسری و فارسی‌زبان است که با تمرکز بر تجربهٔ RTL، جست‌وجوی ساختاریافته، دادهٔ مکانی دقیق، چت امن و عملیات قابل ممیزی طراحی می‌شود.

## نصب خودکار روی سرور

روی Ubuntu 22.04/24.04 یا Debian 12 با کاربر دارای دسترسی `sudo` فقط این دستور را اجرا کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/ostaddehdari/haftsoo/main/install.sh | sudo bash
```

نصاب به‌طور خودکار Git، Docker Engine، افزونهٔ Docker Compose، مخزن هفت‌سو، کانتینر وب، Health Check و مسیر Nginx مربوط به `https://srun.ir/haftsoo/` را آماده می‌کند. هیچ رمز، Token یا کلید SSH داخل مخزن نیست.

اگر فایل Virtual Host به‌صورت خودکار شناسایی نشد، مسیر آن را مشخص کنید:

```bash
curl -fsSL https://raw.githubusercontent.com/ostaddehdari/haftsoo/main/install.sh | \
  sudo env HAFTSOO_NGINX_VHOST=/etc/nginx/sites-enabled/srun.ir bash
```

تنظیمات اختیاری:

```bash
curl -fsSL https://raw.githubusercontent.com/ostaddehdari/haftsoo/main/install.sh | \
  sudo env HAFTSOO_DOMAIN=srun.ir HAFTSOO_BASE_PATH=/haftsoo HAFTSOO_WEB_PORT=3100 bash
```

به‌روزرسانی نسخهٔ نصب‌شده:

```bash
sudo bash /opt/haftsoo/scripts/update.sh
```

بررسی سرویس:

```bash
curl -fsS http://127.0.0.1:3100/healthz
docker compose -f /opt/haftsoo/compose.yaml ps
```

> نصب سریع با `curl | bash` برای سرور اختصاصی پروژه فراهم شده است. در محیط حساس، ابتدا `install.sh` را دانلود و بازبینی و سپس اجرا کنید.

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

## تأیید پروژه

```bash
npm run verify:all
```

این دستور خروجی‌های استیج ۱، فایل‌های نصب، تنظیم مقصد استقرار و نبود الگوهای رایج Secret را بررسی می‌کند. GitHub Actions همین کنترل را روی هر Push و Pull Request اجرا می‌کند.

## سیاست امنیت

هیچ رمز، Token، کلید SSH، فایل `.env` یا دادهٔ شخصی نباید وارد Git شود. تنظیمات مقصد سرور فقط شامل داده‌های غیرمحرمانه است.

