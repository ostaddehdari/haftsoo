# S04-W03 — Registry و Orchestration

سه Image مستقل Web، API و Chat در GHCR منتشر می‌شوند. Workflow `publish-images.yml` برای Tag نسخه یا اجرای دستی، SBOM و Provenance تولید می‌کند. مرجع Deploy باید Tag تغییرناپذیر `sha-*` یا Digest باشد؛ Tagهای محیطی مرجع ممیزی هستند نه منبع قطعی Deploy.

Staging با `ops/compose/staging.yaml` اجرا می‌شود:

```bash
cp ops/compose/staging.env.example ops/compose/staging.env
bash scripts/manage-secrets.sh bootstrap /etc/haftsoo/secrets
docker compose --env-file ops/compose/staging.env -f ops/compose/staging.yaml config --quiet
docker compose --env-file ops/compose/staging.env -f ops/compose/staging.yaml up -d
```

Promotion مستلزم موفقیت CI، Recovery Drill، بازبینی Manifest و ثبت Commit SHA است. Production تا طراحی Rollout امن در استیج بعد، همان سرویس پایدار فعلی می‌ماند.
