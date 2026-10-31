# S08-W06 — API عمومی مکان و مرز

| مسیر | کاربرد |
|---|---|
| `GET /v1/geo/places?parentKey=&type=` | فرزندان یک مکان یا ریشه |
| `GET /v1/geo/places/:key` | جزئیات، مرکز، bbox و شناسه‌ها |
| `GET /v1/geo/places/:key/boundary?precision=simplified|full` | GeoJSON مرز |
| `GET /v1/geo/search?q=&limit=` | جست‌وجوی نام و نام‌های جایگزین |
| `GET /v1/geo/resolve?longitude=&latitude=&type=` | مکان‌های پوشانندهٔ نقطه |

Envelope پاسخ `geoVersion` دارد. پاسخ‌های سلسله‌مراتب و مرز ETag مبتنی بر Checksum و Cache-Control دارند؛ مرز پیش‌فرض Simplified است تا Payload نقشه کوچک بماند.
