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
- تکمیل‌شده: `S01` تا `S14`؛ آخرین خروجی ویزارد کامل ثبت آگهی است
- استیج بعدی: `S15 — رسانه، تصویر و ویدیو`
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

گیت دادهٔ ملی و کنترل Polygon در استیج ۹:

```bash
bash scripts/build-stage-09.sh
RUN_DATABASE_DRILL=1 bash scripts/build-stage-09.sh
```

گیت پوسته عمومی و صفحه نخست در استیج ۱۰:

```bash
bash scripts/build-stage-10.sh
```

گیت فهرست آگهی و دسته‌بندی در استیج ۱۱:

```bash
bash scripts/build-stage-11.sh
```

گیت OpenSearch، Relevance و SLA در استیج ۱۲:

```bash
bash scripts/build-stage-12.sh
```

گیت MapLibre، Viewport و GIS در استیج ۱۳:

```bash
bash scripts/build-stage-13.sh
```

گیت ویزارد ثبت، Draft و ارسال Idempotent در استیج ۱۴:

```bash
bash scripts/build-stage-14.sh
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

## خروجی استیج ۹

| ورک | خروجی |
|---|---|
| S09-W01 | ۱۱۷۷ شهر و شناسه‌های مرجع نسخه‌دار |
| S09-W02 | ۲۸۲۶ محله با اتصال بدون orphan به شهر |
| S09-W03 | Decode کامل Polyline با Precision 5 |
| S09-W04 | Validation و Repair هندسه در برنامه و PostGIS |
| S09-W05 | روابط کشور، استان، شهر و محله |
| S09-W06 | GiSTهای release، boundary، center و bbox |
| S09-W07 | API سلسله‌مراتب مکانی و Cache versioned |
| S09-W08 | Selector آبشاری استان، شهر و چندمحله |
| S09-W09 | ابزار MapLibre و گزارش QA سراسری |
| S09-W10 | گیت دقیق شمار، پوشش، checksum و CI |

گزارش پذیرش در [docs/stage-09/acceptance.md](docs/stage-09/acceptance.md) و گزارش ماشین‌خوان در [reports/geo/national-quality.json](reports/geo/national-quality.json) است. دادهٔ مرجع برای بازتولید به قطعات Base64 فشرده و checksum‌شده تقسیم شده است؛ وضعیت مجوز بازتوزیع پیش از تولید باید بازبینی حقوقی شود.

## خروجی استیج ۱۰

| ورک | خروجی |
|---|---|
| S10-W01 | Nuxt SSR، RTL و Layout عمومی |
| S10-W02 | Header، Navigation و منوی موبایل |
| S10-W03 | انتخاب حداکثر ۱۰ شهر و ماندگاری انتخاب |
| S10-W04 | صفحه نخست و جست‌وجوی وابسته به شهر |
| S10-W05 | شهرهای پربازدید با جست‌وجوی محلی |
| S10-W06 | Footer، لینک‌های پشتیبانی و جایگاه اعتماد |
| S10-W07 | Light/Dark و پیروی از ترجیح سیستم |
| S10-W08 | Loading، Error و Empty State دسترس‌پذیر |
| S10-W09 | SEO، canonical، JSON-LD و Analytics حریم‌خصوصی‌محور |
| S10-W10 | گیت بصری و هم‌ترازی Nuxt با نسخه نصب‌شونده |

گزارش پذیرش در [docs/stage-10/acceptance.md](docs/stage-10/acceptance.md) است. نسخهٔ `deploy/web` همان قابلیت‌های صفحه نخست Nuxt را برای استقرار فعلی Nginx ارائه می‌کند.

## خروجی استیج ۱۱

| ورک | خروجی |
|---|---|
| S11-W01 | Routeهای SSR فهرست بر پایه شهر و دسته‌بندی |
| S11-W02 | Sidebar درخت دسته‌ها و زیرشاخه‌های انتخاب‌شده |
| S11-W03 | کارت آگهی، تصویر Lazy و وضعیت بدون تصویر |
| S11-W04 | صفحه‌بندی قابل لینک و Infinite Scroll کنترل‌شده |
| S11-W05 | مرتب‌سازی قیمت/زمان و حالت شبکه‌ای/فهرستی ماندگار |
| S11-W06 | Layout واکنش‌گرا برای دسکتاپ و موبایل |
| S11-W07 | Badgeهای فوری، ویژه، فروشگاه و معاوضه |
| S11-W08 | Skeleton، Lazy Loading و وضعیت بارگذاری دسترس‌پذیر |
| S11-W09 | Empty و No-result State همراه اقدام اصلاح فیلتر |
| S11-W10 | گیت پذیرش Nuxt و نسخهٔ نصب‌شونده Nginx |

گزارش پذیرش در [docs/stage-11/acceptance.md](docs/stage-11/acceptance.md) است. مسیر نمونه `/s/isfahan/real-estate` و نسخهٔ نصب‌شونده با مسیرهای hash امکان بررسی بدون Backend جست‌وجو را فراهم می‌کنند.

## خروجی استیج ۱۲

| ورک | خروجی |
|---|---|
| S12-W01 | Index Template و Mapping سخت‌گیرانه OpenSearch |
| S12-W02 | Pipeline تکرارپذیر Bulk برای همگام‌سازی آگهی |
| S12-W03 | نرمال‌سازی یکسان فارسی در Ingest و Query |
| S12-W04 | Query DSL محدود، امن و دارای Cursor |
| S12-W05 | اتصال فیلدهای پویا و Facetها به Search |
| S12-W06 | Suggestion و Autocomplete فارسی |
| S12-W07 | Ranking متن، کیفیت و Freshness |
| S12-W08 | Saved Search و Alert چندکاناله بدون تکرار |
| S12-W09 | Fixtureهای Relevance و Performance gate |
| S12-W10 | SLA، CI و گیت پذیرش Search |

گزارش پذیرش در [docs/stage-12/acceptance.md](docs/stage-12/acceptance.md)، قرارداد SLA در [search/sla.json](search/sla.json) و گزارش ماشین‌خوان کیفیت در [reports/search/stage-12-quality.json](reports/search/stage-12-quality.json) قرار دارد.

## خروجی استیج ۱۳

| ورک | خروجی |
|---|---|
| S13-W01 | راه‌اندازی lifecycle ایمن MapLibre GL JS در Nuxt |
| S13-W02 | Style نسخه ۸، Tile قابل تنظیم و Attribution اجباری |
| S13-W03 | API امن Viewport، Camera State و Hash پایدار |
| S13-W04 | Cluster مکانی OpenSearch و تعامل سمت کاربر |
| S13-W05 | Bounding Box Search همراه Tenant isolation |
| S13-W06 | Polygon محله با GeoJSON مستقل |
| S13-W07 | Marker انتخابی و Preview آگهی |
| S13-W08 | همگام‌سازی Map/List، فیلترها و URL |
| S13-W09 | بودجه Query، Render و Debounce مکانی |
| S13-W10 | گیت چهار شهر و سه سطح Zoom |

گزارش پذیرش در [docs/stage-13/acceptance.md](docs/stage-13/acceptance.md)، بودجه در [maps/performance-budget.json](maps/performance-budget.json) و گزارش کیفیت در [reports/map/stage-13-quality.json](reports/map/stage-13-quality.json) قرار دارد.
