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

## وضعیت تحویل

- برنامه اجرایی: ۴۰ استیج، هر استیج دقیقاً ۱۰ ورک
- تکمیل‌شده: `S01` تا `S08`؛ آخرین خروجی سکوی جغرافیا، شهر، محله و Polygon است
- استیج بعدی: `S09 — آگهی و چرخهٔ انتشار`
- Prototype پایدار: [https://srun.ir/haftsoo/](https://srun.ir/haftsoo/)

## ساختار Monorepo

| مسیر | فناوری | مسئولیت |
|---|---|---|
| `apps/web` | Nuxt 3 | SSR، UI و BFF وب |
| `apps/api` | NestJS + Fastify | API هسته و ماژول‌های دامنه |
| `services/chat` | Go | چت و مسیر بلادرنگ |
| `packages/contracts` | TypeScript | قراردادهای مشترک Version شده |
| `infra` | Ansible + JSON | توپولوژی محیط‌ها و آماده‌سازی Host |
| `ops` | Compose + Policy | Staging، Edge، Backup، Secret و ظرفیت |
| `deploy/web` | HTML/CSS/JS | Prototype تولیدی پایدار تا Rollout کنترل‌شده |

## توسعه محلی

```bash
npm ci
npm run verify:all
npm run lint
npm run typecheck
npm run test
npm run build
```

یا همه سرویس‌ها با Container:

```bash
docker compose -f compose.dev.yaml up --build
```

گیت کامل S03:

```bash
bash scripts/build-stage-03.sh
```

گیت زیرساخت S04 (بدون بالا آوردن سرویس‌های Staging):

```bash
bash scripts/build-stage-04.sh
```

گیت کامل همراه آزمون Restore یک‌بارمصرف:

```bash
RUN_RECOVERY_DRILL=1 bash scripts/build-stage-04.sh
```

گیت امنیت و IAM استیج ۵:

```bash
bash scripts/build-stage-05.sh
```

گیت Schema و PostGIS استیج ۶:

```bash
bash scripts/build-stage-06.sh
RUN_DATABASE_DRILL=1 bash scripts/build-stage-06.sh
```

گیت کاتالوگ و فیلدهای پویا در استیج ۷:

```bash
bash scripts/build-stage-07.sh
RUN_DATABASE_DRILL=1 bash scripts/build-stage-07.sh
```

گیت جغرافیا، شهر، محله و Polygon در استیج ۸:

```bash
bash scripts/build-stage-08.sh
RUN_DATABASE_DRILL=1 bash scripts/build-stage-08.sh
```

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۸

| ورک | خروجی |
|---|---|
| S08-W01 | سلسله‌مراتب کشور، استان، شهرستان، بخش، شهر و محله |
| S08-W02 | نسخه‌بندی Draft/Published/Retired و Checksum |
| S08-W03 | نرمال‌سازی و کنترل کیفیت Polygon/MultiPolygon |
| S08-W04 | قرارداد JSON مستقل از Provider و ابزار بررسی آفلاین |
| S08-W05 | PostGIS، GiST، Trigram و RLS Tenant |
| S08-W06 | API عمومی مکان، مرکز، bbox و GeoJSON مرز |
| S08-W07 | جست‌وجو و Reverse Resolve با `ST_Covers` |
| S08-W08 | API مدیریتی Validate/Import/Publish و Outbox |
| S08-W09 | تست Core، Contract، Recovery و مشاهده‌پذیری GIS |
| S08-W10 | گیت CI و پذیرش سکوی جغرافیا |

جزئیات پذیرش در [docs/stage-08/acceptance.md](docs/stage-08/acceptance.md) ثبت شده است. Fixture جغرافیا مصنوعی است؛ دادهٔ کامل کشور از مسیر Import کنترل‌شده بارگذاری می‌شود. هیچ رمز، Token، کلید SSH، فایل `.env`، Dump یا داده شخصی نباید وارد Git شود.
