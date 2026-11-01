export default defineNuxtConfig({
  compatibilityDate: "2026-10-31",
  devtools: { enabled: false },
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL ?? "/",
    head: {
      htmlAttrs: { lang: "fa-IR", dir: "rtl" },
      title: "هفت‌سو | بازار آگهی ایران",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#ffffff", media: "(prefers-color-scheme: light)" },
        { name: "theme-color", content: "#18181b", media: "(prefers-color-scheme: dark)" },
        { name: "color-scheme", content: "light dark" },
        { name: "format-detection", content: "telephone=no" },
        { name: "referrer", content: "strict-origin-when-cross-origin" }
      ],
      link: [{ rel: "canonical", href: "https://srun.ir/haftsoo/" }]
    }
  },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "/api/v1"
    }
  },
  typescript: { strict: true, typeCheck: true }
});
