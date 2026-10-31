# S04-W05 — سرویس‌های پلتفرم

| سرویس | مسئولیت | دوام | معیار سلامت |
|---|---|---|---|
| Redis | Cache، Rate limit و Presence | AOF در Staging؛ HA در Production | latency، memory، evictions |
| Kafka | Eventهای دامنه و پردازش غیرهمزمان | KRaft؛ حداقل سه Broker در Production | consumer lag، ISR |
| OpenSearch | جست‌وجوی متن و Facet آگهی | تک‌گره Staging؛ سه گره Production | cluster health، indexing lag |
| S3/MinIO | عکس، ویدئو و Artifact | Versioning و Object Lock | error rate، capacity |

شبکه `data` در Compose داخلی است. فقط Web/API/Chat به آن دسترسی دارند و هیچ Port دیتایی روی Host منتشر نمی‌شود. Schema رویدادها Version شده، Consumerها idempotent و Objectها با Hash محتوایی کنترل می‌شوند.
