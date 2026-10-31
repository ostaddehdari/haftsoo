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
- تکمیل‌شده: `S01` تا `S07`؛ آخرین خروجی کاتالوگ دسته‌بندی و فرم پویا است
- استیج بعدی: `S08 — جغرافیا، شهر و محله`
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

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۷

| ورک | خروجی |
|---|---|
| S07-W01 | درخت دسته‌بندی پایدار با Cycle/Depth guard |
| S07-W02 | نسخه‌بندی Draft/Published/Retired و Checksum |
| S07-W03 | فیلدها، گزینه‌ها و Validatorهای پویا |
| S07-W04 | فرم‌های دسته و Ruleهای شرطی |
| S07-W05 | ۷ جدول کاتالوگ، Index و RLS Tenant |
| S07-W06 | API عمومی درخت و فرم با ETag |
| S07-W07 | API مدیریتی Validate/Import/Publish |
| S07-W08 | قرارداد JSON و ابزار بررسی آفلاین |
| S07-W09 | تست Core، Contract و مشاهده‌پذیری نسخه |
| S07-W10 | گیت CI و پذیرش کاتالوگ |

جزئیات پذیرش در [docs/stage-07/acceptance.md](docs/stage-07/acceptance.md) ثبت شده است. هیچ رمز، Token، کلید SSH، فایل `.env`، Dump یا داده شخصی نباید وارد Git شود.
