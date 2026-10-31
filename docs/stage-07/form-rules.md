# S07-W04 — فرم دسته و قواعد شرطی

اتصال دسته و فیلد، Section، Position، Required و Override را مشخص می‌کند. Ruleها با `dependsOn + operator + operand + effect` رفتار نمایشی را بدون کد اختصاصی دسته تعیین می‌کنند.

Operatorها شامل برابری، عضویت، وجود و مقایسه عددی‌اند. Effectها `show/hide/require/disable` هستند. ترتیب Rule با Priority قطعی است و موتور مشترک در `catalog-core.ts` اجرا می‌شود.
