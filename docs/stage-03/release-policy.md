# S03-W07 — Branching، Versioning و Release

- شاخه پایدار: `main`؛ همیشه قابل Build و Deploy.
- کارها: `feat/<ticket>-<slug>`، رفع خطا: `fix/<ticket>-<slug>`.
- Merge فقط با CI سبز و Review؛ روش ترجیحی Squash Merge.
- پیام Commit مطابق Conventional Commits.
- نسخه‌ها SemVer هستند؛ نسخه Stage 3 برابر `0.3.0-stage.3` است.
- Release Candidate با Tag مانند `v0.3.0-rc.1` و تولید با `v0.3.0` منتشر می‌شود.
- Rollback با Deploy مجدد Tag قبلی انجام می‌شود؛ Migration مخرب در Release همزمان ممنوع است.
