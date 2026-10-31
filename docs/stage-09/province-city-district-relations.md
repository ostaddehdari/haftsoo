# S09-W05 — روابط Province، City و District

ساختار ملی `country → province → city → neighborhood` است. هر release یک درخت مستقل و immutable دارد، parent باید در همان tenant و release باشد و چرخه و عمق بیش از ۸ ممنوع است. نوع district منبع برای UI به neighborhood نگاشت می‌شود.
