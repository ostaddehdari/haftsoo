# S03-W08 — Pipeline پایه CI

Workflow `verify.yml` سه گیت دارد:

1. `node`: نصب Frozen با `npm ci`، تأیید S01 تا S03، Lint، Format، Typecheck، Test و Build همه Workspaceها؛
2. `go`: `gofmt`، Test و Build سرویس چت؛
3. `compose`: اعتبارسنجی مدل Compose توسعه و Dockerfileها.

مجوز Workflow فقط `contents: read` است. Secret یا Deploy در Pull Request اجرا نمی‌شود. `package-lock.json` نسخه ۳ در مخزن ثبت شده و Lockfile هر اجرای موفق نیز برای ممیزی کوتاه‌مدت به‌عنوان Artifact نگهداری می‌شود.
