# S06-W10 — گیت Schema Baseline و Restore

وضعیت S06: **پذیرفته‌شده** پس از سبز شدن CI و ثبت SHA نهایی.

| کنترل | شاهد | نتیجه |
|---|---|---|
| ۱۰ ورک | `project.state.json` | کامل |
| Naming/ID/time/delete | `database/conventions.json` | کامل |
| PostGIS و Schema | Migration `000001` | کامل |
| Migration/Rollback | `scripts/db-migrate.mjs` | کامل |
| Repository/UoW | `apps/api/src/database` و Unit test | کامل |
| Outbox/Inbox | Migration `000002` و Repository | کامل |
| Partition/Archive | Policy و Manifest | کامل |
| Index/Budget | `database/query-budget.json` | کامل |
| Backup/Restore | `scripts/recovery-drill.sh` | کامل |
| Secret/Diff/CI | Workflow verify و Review نهایی | کامل |

گیت محلی `bash scripts/build-stage-06.sh` است. گیت کامل دیتابیس با `RUN_DATABASE_DRILL=1 bash scripts/build-stage-06.sh` اجرا می‌شود. Production static prototype در این استیج تغییر نمی‌کند.
