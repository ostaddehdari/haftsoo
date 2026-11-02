export type AuthDeliveryMethod = "sms" | "call" | "messenger";

export interface AuthSession {
  id: string;
  status: "active" | "revoked" | "expired";
  device_name: string;
  device_kind: string;
  last_ip_label: string;
  last_seen_at: string;
  created_at: string;
  current: boolean;
}

interface AuthUser { id: string; phoneNumber: string }
interface Envelope<T> { data: T }

const messages: Record<string, string> = {
  invalid_phone: "شمارهٔ موبایل معتبر نیست.",
  cooldown: "برای ارسال دوباره کمی صبر کنید.",
  rate_limited: "تعداد درخواست‌ها بیش از حد مجاز است.",
  challenge_expired: "زمان کد تأیید تمام شده است.",
  invalid_code: "کد تأیید صحیح نیست.",
  attempts_exhausted: "تعداد تلاش‌های مجاز تمام شده است.",
  refresh_reuse: "نشست برای حفظ امنیت بسته شد؛ دوباره وارد شوید.",
  session_revoked: "این نشست دیگر فعال نیست."
};

export function useAuth() {
  const config = useRuntimeConfig();
  const accessToken = useState<string | null>("auth-access-token", () => null);
  const user = useState<AuthUser | null>("auth-user", () => null);
  const sessions = useState<AuthSession[]>("auth-sessions", () => []);
  const pending = useState("auth-pending", () => false);
  const error = useState<string | null>("auth-error", () => null);
  const deviceId = useCookie("hs_device", { maxAge: 31_536_000, sameSite: "lax" });
  const sessionHint = useCookie("hs_session", { maxAge: 2_592_000, sameSite: "lax" });
  const tenantId = String(config.public.tenantId || "00000000-0000-4000-8000-000000000001");
  const authenticated = computed(() => Boolean(accessToken.value && user.value));

  function ensureDevice() {
    if (!deviceId.value) deviceId.value = crypto.randomUUID();
    return deviceId.value;
  }

  async function request<T>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
    error.value = null;
    try {
      return await $fetch<Envelope<T>>(path, {
        baseURL: String(config.public.apiBase || "/api/v1"),
        credentials: "include",
        ...options,
        headers: {
          "x-tenant-id": tenantId,
          ...(accessToken.value ? { authorization: `Bearer ${accessToken.value}` } : {}),
          ...(options.headers || {})
        }
      });
    } catch (caught: any) {
      const code = caught?.data?.code || caught?.data?.message?.code || "unknown";
      error.value = messages[code] || "ارتباط با سامانه ورود برقرار نشد.";
      throw caught;
    }
  }

  async function sendCode(phoneNumber: string, method: AuthDeliveryMethod) {
    pending.value = true;
    try {
      const response = await request<{ preAuthSessionId: string; maskedPhone: string; cooldownUntil: string }>("/auth/send-code", { method: "POST", body: { phoneNumber, method } });
      return response.data;
    } finally { pending.value = false; }
  }

  async function consumeCode(preAuthSessionId: string, code: string) {
    pending.value = true;
    try {
      const response = await request<{ user: AuthUser; accessToken: string }>("/auth/code/consume", {
        method: "POST",
        body: { preAuthSessionId, code, deviceClientId: ensureDevice(), deviceName: navigator.userAgent.includes("Mobile") ? "مرورگر موبایل" : "مرورگر دسکتاپ" }
      });
      accessToken.value = response.data.accessToken;
      user.value = response.data.user;
      sessionHint.value = "1";
      return response.data;
    } finally { pending.value = false; }
  }

  async function refresh() {
    const response = await request<{ accessToken: string; user: AuthUser }>("/auth/refresh", { method: "POST" });
    accessToken.value = response.data.accessToken;
    user.value = response.data.user;
    return response.data;
  }

  async function loadSessions() {
    const response = await request<AuthSession[]>("/auth/sessions");
    sessions.value = response.data;
    return response.data;
  }

  async function revokeSession(id: string) {
    await request(`/auth/sessions/${id}`, { method: "DELETE" });
    sessions.value = sessions.value.map(session => session.id === id ? { ...session, status: "revoked" } : session);
  }

  async function logout() {
    await request("/auth/logout", { method: "POST" }).catch(() => undefined);
    accessToken.value = null;
    user.value = null;
    sessions.value = [];
    sessionHint.value = null;
  }

  async function restore() {
    if (accessToken.value || sessionHint.value !== "1") return authenticated.value;
    try { await refresh(); return true; } catch { sessionHint.value = null; return false; }
  }

  return { accessToken, authenticated, error, loadSessions, logout, pending, refresh, restore, revokeSession, sendCode, consumeCode, sessions, user };
}
