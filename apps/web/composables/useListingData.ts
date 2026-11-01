export type ListingCategory = {
  name: string;
  slug: string;
  count: number;
  children?: ListingCategory[];
};

export type ListingPost = {
  listingId: string;
  title: string;
  city: string;
  cityName: string;
  district: string;
  category: string;
  price: number | null;
  priceLabel: string;
  publishedAt: number;
  publishedLabel: string;
  thumbnail?: string;
  badges: Array<"urgent" | "featured" | "business" | "exchange">;
  latitude?: number;
  longitude?: number;
};

export const listingCategories: ListingCategory[] = [
  { name: "املاک", slug: "real-estate", count: 18420, children: [
    { name: "فروش مسکونی", slug: "buy-residential", count: 8240 },
    { name: "اجاره مسکونی", slug: "rent-residential", count: 6150 },
    { name: "فروش اداری و تجاری", slug: "buy-commercial", count: 2470 },
    { name: "اجاره اداری و تجاری", slug: "rent-commercial", count: 1560 }
  ] },
  { name: "وسایل نقلیه", slug: "vehicles", count: 9860, children: [
    { name: "خودرو سواری", slug: "auto", count: 6940 },
    { name: "موتورسیکلت", slug: "motorcycles", count: 1720 },
    { name: "قطعات یدکی", slug: "vehicle-parts", count: 1200 }
  ] },
  { name: "کالای دیجیتال", slug: "electronic-devices", count: 7340, children: [
    { name: "موبایل و تبلت", slug: "mobile-tablet", count: 4160 },
    { name: "رایانه", slug: "computers", count: 2040 },
    { name: "صوتی و تصویری", slug: "audio-video", count: 1140 }
  ] },
  { name: "خانه و آشپزخانه", slug: "home-kitchen", count: 5280 },
  { name: "خدمات", slug: "services", count: 3960 },
  { name: "استخدام و کاریابی", slug: "jobs", count: 2810 }
];

const svgThumbnail = (label: string, from: string, to: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="480" height="360" rx="28" fill="url(#g)"/><rect x="70" y="115" width="340" height="190" rx="22" fill="#fff" opacity=".34"/><circle cx="370" cy="78" r="34" fill="#fff" opacity=".45"/><text x="240" y="215" text-anchor="middle" font-family="Tahoma,Arial" font-size="28" fill="#27272a" opacity=".78">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const listingPosts: ListingPost[] = [
  { listingId: "hs-a91m2", title: "آپارتمان ۹۵ متری نورگیر، عباس‌آباد", city: "isfahan", cityName: "اصفهان", district: "عباس‌آباد", category: "real-estate", price: 6800000000, priceLabel: "۶٬۸۰۰٬۰۰۰٬۰۰۰ تومان", publishedAt: 12, publishedLabel: "۱۲ دقیقه پیش", thumbnail: svgThumbnail("آپارتمان", "#d8c3ab", "#f7eee3"), badges: ["urgent", "featured"], latitude: 32.6539, longitude: 51.6632 },
  { listingId: "hs-c31k8", title: "پژو ۲۰۷ اتوماتیک کم‌کارکرد مدل ۱۴۰۲", city: "isfahan", cityName: "اصفهان", district: "خانه اصفهان", category: "vehicles", price: 1280000000, priceLabel: "۱٬۲۸۰٬۰۰۰٬۰۰۰ تومان", publishedAt: 18, publishedLabel: "۱۸ دقیقه پیش", thumbnail: svgThumbnail("خودرو", "#8eafbc", "#e7f3f6"), badges: ["business"], latitude: 32.7042, longitude: 51.6651 },
  { listingId: "hs-p72q4", title: "گوشی پرچمدار ۲۵۶ گیگ با ضمانت", city: "isfahan", cityName: "اصفهان", district: "مرداویج", category: "electronic-devices", price: 54500000, priceLabel: "۵۴٬۵۰۰٬۰۰۰ تومان", publishedAt: 27, publishedLabel: "۲۷ دقیقه پیش", thumbnail: svgThumbnail("موبایل", "#9ba7d2", "#eef0fb"), badges: ["exchange"], latitude: 32.6138, longitude: 51.6675 },
  { listingId: "hs-f82r5", title: "مبل راحتی هفت‌نفره سالم و تمیز", city: "isfahan", cityName: "اصفهان", district: "ملک‌شهر", category: "home-kitchen", price: 24500000, priceLabel: "۲۴٬۵۰۰٬۰۰۰ تومان", publishedAt: 43, publishedLabel: "۴۳ دقیقه پیش", thumbnail: svgThumbnail("مبلمان", "#b79b86", "#f3e8df"), badges: [], latitude: 32.7384, longitude: 51.6911 },
  { listingId: "hs-j12v7", title: "استخدام کارشناس پشتیبانی مشتریان", city: "isfahan", cityName: "اصفهان", district: "چهارباغ بالا", category: "jobs", price: null, priceLabel: "حقوق توافقی", publishedAt: 61, publishedLabel: "۱ ساعت پیش", thumbnail: svgThumbnail("استخدام", "#8ca697", "#e5efe9"), badges: ["business"], latitude: 32.6298, longitude: 51.6647 },
  { listingId: "hs-s64n1", title: "تعمیر تخصصی کولر گازی در محل", city: "isfahan", cityName: "اصفهان", district: "سپاهان‌شهر", category: "services", price: null, priceLabel: "توافقی", publishedAt: 84, publishedLabel: "۱ ساعت پیش", badges: ["urgent"], latitude: 32.5446, longitude: 51.6643 },
  { listingId: "hs-a44z9", title: "فروش خانه ویلایی دوطبقه با حیاط", city: "isfahan", cityName: "اصفهان", district: "رهنان", category: "real-estate", price: 9250000000, priceLabel: "۹٬۲۵۰٬۰۰۰٬۰۰۰ تومان", publishedAt: 96, publishedLabel: "۱ ساعت پیش", thumbnail: svgThumbnail("خانه ویلایی", "#d7b392", "#f8eee4"), badges: [], latitude: 32.6813, longitude: 51.6004 },
  { listingId: "hs-c18x2", title: "موتورسیکلت شهری مدل ۱۴۰۳ بدون خط", city: "isfahan", cityName: "اصفهان", district: "جابر انصاری", category: "vehicles", price: 185000000, priceLabel: "۱۸۵٬۰۰۰٬۰۰۰ تومان", publishedAt: 122, publishedLabel: "۲ ساعت پیش", thumbnail: svgThumbnail("موتورسیکلت", "#88939e", "#e3e8ec"), badges: ["featured"], latitude: 32.6898, longitude: 51.6805 },
  { listingId: "hs-p90d3", title: "لپ‌تاپ مهندسی ۱۶ گیگ، بسیار تمیز", city: "isfahan", cityName: "اصفهان", district: "دانشگاه", category: "electronic-devices", price: 46200000, priceLabel: "۴۶٬۲۰۰٬۰۰۰ تومان", publishedAt: 153, publishedLabel: "۲ ساعت پیش", thumbnail: svgThumbnail("لپ‌تاپ", "#7487a5", "#e8edf5"), badges: [], latitude: 32.7148, longitude: 51.6789 },
  { listingId: "hs-h37b6", title: "میز ناهارخوری شش‌نفره چوبی", city: "isfahan", cityName: "اصفهان", district: "شیخ صدوق", category: "home-kitchen", price: 18700000, priceLabel: "۱۸٬۷۰۰٬۰۰۰ تومان", publishedAt: 181, publishedLabel: "۳ ساعت پیش", thumbnail: svgThumbnail("میز چوبی", "#9b765d", "#eee0d4"), badges: ["exchange"], latitude: 32.6204, longitude: 51.6856 },
  { listingId: "hs-a55t1", title: "آپارتمان دوخوابه نزدیک مترو", city: "tehran", cityName: "تهران", district: "صادقیه", category: "real-estate", price: 11200000000, priceLabel: "۱۱٬۲۰۰٬۰۰۰٬۰۰۰ تومان", publishedAt: 21, publishedLabel: "۲۱ دقیقه پیش", thumbnail: svgThumbnail("آپارتمان", "#c8b49d", "#f5eadf"), badges: ["urgent"], latitude: 35.7212, longitude: 51.3357 },
  { listingId: "hs-c66u2", title: "سدان خانوادگی مدل ۱۴۰۱", city: "tehran", cityName: "تهران", district: "تهرانپارس", category: "vehicles", price: 1560000000, priceLabel: "۱٬۵۶۰٬۰۰۰٬۰۰۰ تومان", publishedAt: 58, publishedLabel: "۵۸ دقیقه پیش", thumbnail: svgThumbnail("خودرو", "#7f9aaa", "#e1edf1"), badges: [], latitude: 35.7355, longitude: 51.5321 }
];

export const categoryLabel = (slug?: string) => {
  for (const category of listingCategories) {
    if (category.slug === slug) return category.name;
    const child = category.children?.find((item) => item.slug === slug);
    if (child) return child.name;
  }
  return "همه آگهی‌ها";
};

export const formatCount = (value: number) => new Intl.NumberFormat("fa-IR").format(value);
