# S04-W02 — Infrastructure as Code

Ansible در `infra/ansible` حداقل Host استاندارد هفت‌سو را می‌سازد: کاربر سرویس بدون Shell، مسیرهای Runtime/Backup/Secret با دسترسی محدود و واحد Systemd برای Stack. Inventory واقعی، IPها و Secretها خارج از Git نگهداری می‌شوند.

اجرای بررسی:

```bash
ansible-playbook --syntax-check -i infra/ansible/inventory.example.ini infra/ansible/site.yml
ansible-playbook --check -i inventory.ini infra/ansible/site.yml
```

تغییر زیرساخت ابتدا در Staging با `--check` و سپس اجرای واقعی اعمال می‌شود. تغییر مستقیم Host فقط برای Incident و همراه با ثبت Drift مجاز است. فایل `compose.yaml` تولید فعلی در S04 تغییر نمی‌کند.
