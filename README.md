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
- تکمیل‌شده: `S01` تا `S06`؛ آخرین خروجی Schema پایه و PostGIS است
- استیج بعدی: `S07 — فهرست موضوعی و دسته‌بندی`
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

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۶

| ورک | خروجی |
|---|---|
| S06-W01 | قرارداد Naming، UUID، زمان UTC و Soft delete |
| S06-W02 | PostGIS، pgcrypto، citext و btree_gist |
| S06-W03 | ۹ Schema با مرز مالکیت سرویس |
| S06-W04 | Migration و Rollback تراکنشی با تشخیص Drift |
| S06-W05 | PostgreSQL Repository و Unit of Work Tenant-aware |
| S06-W06 | Outbox/Inbox idempotent و RLS اجباری |
| S06-W07 | Range partition و Archive manifest |
| S06-W08 | Indexهای پایه و Query budget ماشین‌خوان |
| S06-W09 | Drill واقعی Backup، Restore، Rollback و Reapply |
| S06-W10 | گیت CI و پذیرش Schema baseline |

جزئیات پذیرش در [docs/stage-06/acceptance.md](docs/stage-06/acceptance.md) ثبت شده است. هیچ رمز، Token، کلید SSH، فایل `.env`، Dump یا داده شخصی نباید وارد Git شود.
