# S20-W02 — بلیت کوتاه‌عمر چت

NestJS پس از اعتبارسنجی access session یک بلیت HMAC با مخاطب `haftsoo-chat`، شناسه tenant، کاربر، نشست، nonce و انقضای ۶۰ثانیه‌ای صادر می‌کند. سرویس Go امضا، audience، بازه زمانی و طول عمر حداکثر ۱۲۰ ثانیه را fail-closed بررسی می‌کند.

بلیت از Query فقط برای handshake WebSocket و از Bearer برای HTTP پذیرفته می‌شود؛ کلید مشترک فقط از secret runtime خوانده می‌شود.
