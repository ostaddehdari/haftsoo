# S03-W06 — Lint، Format، Typecheck و Commitlint

گیت کیفیت محلی و CI یکسان است:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run commitlint -- "feat(web): add search shell"
```

`lint.mjs` قواعد مخزن و JSON را بدون وابستگی بیرونی کنترل می‌کند؛ `format-check.mjs` خط‌پایان و فاصله‌های زائد را می‌سنجد؛ Typecheck واقعی هر Workspace را بررسی می‌کند؛ Commitlint الگوی Conventional Commits را اعمال می‌کند. Go نیز با `gofmt` و `go test` کنترل می‌شود.
