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
- تکمیل‌شده: `S01` منشور محصول، `S02` سیستم طراحی، `S03` استاندارد مهندسی و `S04` زیرساخت و محیط‌ها
- استیج بعدی: `S05 — امنیت و مدیریت هویت پایه`
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

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۴

| ورک | خروجی |
|---|---|
| S04-W01 | توپولوژی Development، Staging و Production |
| S04-W02 | Ansible برای Host استاندارد و بدون Drift |
| S04-W03 | GHCR، Imageهای تغییرناپذیر و Compose Staging |
| S04-W04 | PostgreSQL/PostGIS و الزامات Managed Production |
| S04-W05 | Redis، Kafka، OpenSearch و MinIO در شبکه داخلی |
| S04-W06 | Secret lifecycle اتمیک و Rotation |
| S04-W07 | سیاست DNS، TLS، CDN و WAF |
| S04-W08 | Backup، PITR، Retention و Recovery Drill |
| S04-W09 | مدل ظرفیت، هزینه و آستانه Scaling |
| S04-W10 | گیت CI برای Staging و بازیابی |

جزئیات پذیرش در [docs/stage-04/acceptance.md](docs/stage-04/acceptance.md) ثبت شده است. هیچ رمز، Token، کلید SSH، فایل `.env` یا داده شخصی نباید وارد Git شود.
