# Runtime secrets

Secret values never belong in Git. Create local or staging values with:

```bash
bash scripts/manage-secrets.sh bootstrap /etc/haftsoo/secrets
bash scripts/manage-secrets.sh verify /etc/haftsoo/secrets
```

Files are written atomically with mode `0600`. Production must replace this
file-backed adapter with an external secret manager and audit every read and
rotation. Rotate one value with `rotate <name> <directory>` and restart only
the consumers listed in the rotation runbook.
