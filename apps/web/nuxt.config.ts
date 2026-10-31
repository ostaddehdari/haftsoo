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
        { name: "theme-color", content: "#a62626" }
      ]
    }
  },
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? "/api/v1"
    }
  },
  typescript: { strict: true, typeCheck: true },
  nitro: { preset: "node-server" }
});
