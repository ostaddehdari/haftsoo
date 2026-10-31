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
- تکمیل‌شده: `S01` تا `S05`؛ آخرین خروجی امنیت و مدیریت هویت پایه است
- استیج بعدی: `S06 — پایه داده و PostGIS`
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

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۵

| ورک | خروجی |
|---|---|
| S05-W01 | دامنه Identity و پنج نوع Principal |
| S05-W02 | کاتالوگ Role، Permission و Scope با Default-deny |
| S05-W03 | Session، Token rotation و Device trust |
| S05-W04 | احراز هویت HMAC سرویس‌به‌سرویس و دفاع Replay |
| S05-W05 | Security header و CORS allowlist |
| S05-W06 | Rate limit و سیاست Abuse چندبعدی |
| S05-W07 | Audit hash-chain امضاشده و سیاست WORM |
| S05-W08 | Threat model کامل STRIDE و Data flow |
| S05-W09 | تست‌های Unit و HTTP امنیتی و Baseline scanner |
| S05-W10 | گیت CI مستقل امنیت و پذیرش IAM |

جزئیات پذیرش در [docs/stage-05/acceptance.md](docs/stage-05/acceptance.md) ثبت شده است. هیچ رمز، Token، کلید SSH، فایل `.env` یا داده شخصی نباید وارد Git شود.
