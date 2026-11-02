# Providerهای تحویل

درگاه `AuthProviderGateway` پیامک، تماس و پیام‌رسان را پشت یک قرارداد جدا می‌کند. نشانی و کلید هر Provider فقط از runtime secret خوانده می‌شود؛ production در نبود تنظیمات fail-closed است.
