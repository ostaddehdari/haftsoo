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
- تکمیل‌شده: `S01` منشور محصول، `S02` سیستم طراحی و `S03` مونوریپو و استاندارد مهندسی
- استیج بعدی: `S04 — زیرساخت و محیط‌ها`
- Prototype پایدار: [https://srun.ir/haftsoo/](https://srun.ir/haftsoo/)

## ساختار Monorepo

| مسیر | فناوری | مسئولیت |
|---|---|---|
| `apps/web` | Nuxt 3 | SSR، UI و BFF وب |
| `apps/api` | NestJS + Fastify | API هسته و ماژول‌های دامنه |
| `services/chat` | Go | چت و مسیر بلادرنگ |
| `packages/contracts` | TypeScript | قراردادهای مشترک Version شده |
| `deploy/web` | HTML/CSS/JS | Prototype تولیدی تا پایان S04 |

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

پورت‌های توسعه: Web روی `3000`، API روی `3001` و Chat روی `3002`.

## خروجی استیج ۳

| ورک | خروجی |
|---|---|
| S03-W01 | Monorepo و CODEOWNERS |
| S03-W02 | پوسته اجرایی Nuxt 3 و Base Path |
| S03-W03 | هسته NestJS ماژولار و Fastify |
| S03-W04 | سرویس Go با Health و Graceful Shutdown |
| S03-W05 | پکیج قراردادهای مشترک |
| S03-W06 | Lint، Format، Typecheck و Commitlint |
| S03-W07 | سیاست Branch، Version و Release |
| S03-W08 | CI چندگانه Node، Go و Container |
| S03-W09 | Compose محیط توسعه |
| S03-W10 | گیت Build تکرارپذیر |

جزئیات پذیرش در [docs/stage-03/acceptance.md](docs/stage-03/acceptance.md) ثبت شده است. هیچ رمز، Token، کلید SSH، فایل `.env` یا داده شخصی نباید وارد Git شود.
