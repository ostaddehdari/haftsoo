# S14-W01 — State Machine ویزارد ثبت

ویزارد شش حالت `category → details → location → media → contact → preview` دارد. فقط حرکت به همان مرحله، یک مرحله جلو یا یک مرحله عقب مجاز است؛ بنابراین پرش از اعتبارسنجی ممکن نیست. قرارداد مرجع در `submission-core.ts` و رابط مرحله‌ها در `useSubmissionWizard.ts` قرار دارد.
