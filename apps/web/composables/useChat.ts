export type ChatConnectionState = "idle" | "connecting" | "online" | "reconnecting" | "offline";
export type ChatDeliveryState = "pending" | "sent" | "seen" | "failed";

export interface ChatPeer {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeenLabel: string;
}

export interface ChatConversationView {
  id: string;
  postToken: string;
  title: string;
  thumbnail: string;
  peer: ChatPeer;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  context: "my_post" | "others_post";
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  sequence: number;
  body: string;
  createdAt: string;
  fromMe: boolean;
  delivery: ChatDeliveryState;
}

interface Envelope<T> { data: T }
interface ChatTicketResponse { ticket: string; expiresAt: string; websocketPath: string }

const actorId = "current-user";
const fixtureConversations: ChatConversationView[] = [
  { id: "conv-apartment", postToken: "hs-a91m2", title: "آپارتمان ۹۵ متری نورگیر، عباس‌آباد", thumbnail: "", peer: { id: "seller-1", name: "کاربر هفت‌سو", avatar: "ک", online: true, lastSeenLabel: "آنلاین" }, lastMessage: "برای بازدید عصر امروز هماهنگ کنیم؟", lastMessageAt: "2026-11-02T17:42:00.000Z", unreadCount: 2, context: "others_post" },
  { id: "conv-laptop", postToken: "hs-laptop", title: "لپ‌تاپ سبک و سالم", thumbnail: "", peer: { id: "buyer-2", name: "مریم", avatar: "م", online: false, lastSeenLabel: "آخرین فعالیت ۲ ساعت پیش" }, lastMessage: "بله، جعبه و شارژر اصلی موجود است.", lastMessageAt: "2026-11-02T14:20:00.000Z", unreadCount: 0, context: "my_post" },
  { id: "conv-bike", postToken: "hs-bike", title: "دوچرخه شهری سایز ۲۶", thumbnail: "", peer: { id: "seller-3", name: "علی", avatar: "ع", online: false, lastSeenLabel: "آخرین فعالیت دیروز" }, lastMessage: "ممنون، بررسی می‌کنم.", lastMessageAt: "2026-11-01T19:05:00.000Z", unreadCount: 0, context: "others_post" }
];

const fixtureMessages: Record<string, ChatMessageView[]> = {
  "conv-apartment": [
    { id: "m-1", conversationId: "conv-apartment", senderId: actorId, clientMessageId: "fixture-0001", sequence: 1, body: "سلام، آگهی هنوز موجود است؟", createdAt: "2026-11-02T17:35:00.000Z", fromMe: true, delivery: "seen" },
    { id: "m-2", conversationId: "conv-apartment", senderId: "seller-1", clientMessageId: "fixture-0002", sequence: 2, body: "سلام، بله موجود است و امکان بازدید با هماهنگی دارید.", createdAt: "2026-11-02T17:37:00.000Z", fromMe: false, delivery: "sent" },
    { id: "m-3", conversationId: "conv-apartment", senderId: "seller-1", clientMessageId: "fixture-0003", sequence: 3, body: "برای بازدید عصر امروز هماهنگ کنیم؟", createdAt: "2026-11-02T17:42:00.000Z", fromMe: false, delivery: "sent" }
  ],
  "conv-laptop": [{ id: "m-4", conversationId: "conv-laptop", senderId: actorId, clientMessageId: "fixture-0004", sequence: 1, body: "بله، جعبه و شارژر اصلی موجود است.", createdAt: "2026-11-02T14:20:00.000Z", fromMe: true, delivery: "seen" }],
  "conv-bike": [{ id: "m-5", conversationId: "conv-bike", senderId: "seller-3", clientMessageId: "fixture-0005", sequence: 1, body: "ممنون، بررسی می‌کنم.", createdAt: "2026-11-01T19:05:00.000Z", fromMe: false, delivery: "sent" }]
};

export function useChat(requestedConversation = ref("")) {
  const config = useRuntimeConfig();
  const { accessToken, authenticated, restore } = useAuth();
  const conversations = useState<ChatConversationView[]>("chat-conversations", () => []);
  const messages = useState<Record<string, ChatMessageView[]>>("chat-messages", () => ({}));
  const activeId = useState<string>("chat-active-id", () => "");
  const connection = useState<ChatConnectionState>("chat-connection", () => "idle");
  const typingPeers = useState<Record<string, boolean>>("chat-typing", () => ({}));
  const pending = ref(false);
  const loadingOlder = ref(false);
  const error = ref("");
  const blocked = ref(false);
  let socket: WebSocket | null = null;
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let cachedTicket: ChatTicketResponse | null = null;

  const active = computed(() => conversations.value.find(item => item.id === activeId.value) ?? null);
  const timeline = computed<ChatMessageView[]>(() => messages.value[activeId.value] ?? []);
  const unreadTotal = computed(() => conversations.value.reduce((sum, item) => sum + item.unreadCount, 0));
  const typing = computed(() => Boolean(active.value && typingPeers.value[active.value.peer.id]));
  const base = String(config.public.chatHttpBase || "/chat-api/v1/chat");

  function authHeaders() {
    return {
      "x-tenant-id": String(config.public.tenantId),
      ...(accessToken.value ? { authorization: `Bearer ${accessToken.value}` } : {})
    };
  }

  async function loadConversations() {
    pending.value = true;
    error.value = "";
    try {
      if (accessToken.value) {
        const response = await $fetch<Envelope<any[]>>("/conversations", { baseURL: base, headers: await chatHeaders() });
        conversations.value = response.data.map(toConversationView);
      } else conversations.value = structuredClone(fixtureConversations);
    } catch {
      conversations.value = structuredClone(fixtureConversations);
      error.value = "نسخه نمایشی گفتگوها نمایش داده می‌شود؛ اتصال زنده در دسترس نیست.";
    } finally { pending.value = false; }
    return conversations.value;
  }

  async function openConversation(key: string) {
    if (!conversations.value.length) await loadConversations();
    const found = conversations.value.find(item => item.id === key || item.postToken === key) ?? conversations.value[0];
    if (!found) return null;
    activeId.value = found.id;
    found.unreadCount = 0;
    if (!messages.value[found.id]) await loadMessages(found.id);
    await markSeen();
    return found;
  }

  async function loadMessages(conversationId: string) {
    try {
      if (accessToken.value) {
        const response = await $fetch<Envelope<any[]>>(`/conversations/${conversationId}/messages`, { baseURL: base, headers: await chatHeaders() });
        messages.value[conversationId] = response.data.map(toMessageView);
      } else messages.value[conversationId] = structuredClone(fixtureMessages[conversationId] ?? []);
    } catch { messages.value[conversationId] = structuredClone(fixtureMessages[conversationId] ?? []); }
  }

  async function loadOlder() {
    if (!activeId.value || loadingOlder.value) return;
    loadingOlder.value = true;
    await new Promise(resolve => setTimeout(resolve, 180));
    loadingOlder.value = false;
  }

  async function issueTicket() {
    const apiBase = String(config.public.apiBase || "/api/v1");
    const response = await $fetch<Envelope<ChatTicketResponse>>("/chat/ticket", { method: "POST", baseURL: apiBase, headers: authHeaders(), body: { postToken: active.value?.postToken } });
    return response.data;
  }

  async function chatHeaders() {
    if (!cachedTicket || new Date(cachedTicket.expiresAt).getTime() - Date.now() < 5000) cachedTicket = await issueTicket();
    return { authorization: `Bearer ${cachedTicket.ticket}` };
  }

  function websocketUrl(ticket: ChatTicketResponse) {
    const configured = String(config.public.chatWebSocketUrl || "");
    const root = configured || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/chat-api/v1/chat/ws`;
    return `${root}?ticket=${encodeURIComponent(ticket.ticket)}`;
  }

  async function connect() {
    if (!import.meta.client || !authenticated.value || socket?.readyState === WebSocket.OPEN) return;
    connection.value = reconnectAttempt ? "reconnecting" : "connecting";
    try {
      const ticket = await issueTicket();
      socket = new WebSocket(websocketUrl(ticket));
      socket.addEventListener("open", () => { connection.value = "online"; reconnectAttempt = 0; flushQueue(); });
      socket.addEventListener("message", event => handleEvent(JSON.parse(String(event.data))));
      socket.addEventListener("close", scheduleReconnect);
      socket.addEventListener("error", () => socket?.close());
    } catch { connection.value = navigator.onLine ? "offline" : "offline"; }
  }

  function scheduleReconnect() {
    socket = null;
    if (!import.meta.client || !navigator.onLine) { connection.value = "offline"; return; }
    connection.value = "reconnecting";
    reconnectAttempt += 1;
    clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => void connect(), Math.min(1000 * 2 ** reconnectAttempt, 15000));
  }

  function handleEvent(event: any) {
    if (event.type === "message.created" && event.message) mergeMessage(toMessageView(event.message));
    if (event.type === "message.ack" && event.message) mergeMessage({ ...toMessageView(event.message), delivery: "sent" });
    if (event.type === "message.seen") markDeliverySeen(event.conversationId, Number(event.sequence || 0));
    if (event.type === "typing.changed") typingPeers.value[event.actorId] = Boolean(event.payload?.typing);
    if (event.type === "error" && event.clientMessageId) markFailed(event.clientMessageId);
  }

  async function send(body: string) {
    const clean = body.replace(/\s+/g, " ").trim().slice(0, 4000);
    if (!clean || !activeId.value || blocked.value) return false;
    const clientMessageId = crypto.randomUUID();
    const optimistic: ChatMessageView = { id: clientMessageId, conversationId: activeId.value, senderId: actorId, clientMessageId, sequence: nextSequence(), body: clean, createdAt: new Date().toISOString(), fromMe: true, delivery: "pending" };
    mergeMessage(optimistic);
    const command = { type: "send_message", conversationId: activeId.value, clientMessageId, body: clean };
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(command));
    else if (accessToken.value) {
      try {
        const response = await $fetch<Envelope<any>>(`/conversations/${activeId.value}/messages`, { method: "POST", baseURL: base, headers: await chatHeaders(), body: { clientMessageId, kind: "text", body: clean } });
        mergeMessage({ ...toMessageView(response.data), delivery: "sent" });
      } catch { queueCommand(command); connection.value = "offline"; }
    } else setTimeout(() => mergeMessage({ ...optimistic, delivery: "sent" }), 220);
    updateConversationPreview(clean, optimistic.createdAt);
    return true;
  }

  function retry(message: ChatMessageView) {
    removeMessage(message.clientMessageId);
    return send(message.body);
  }

  function setTyping(value: boolean) {
    if (socket?.readyState === WebSocket.OPEN && activeId.value) socket.send(JSON.stringify({ type: "typing", conversationId: activeId.value, typing: value }));
  }

  async function markSeen() {
    const last = timeline.value.at(-1);
    if (!last || !activeId.value) return;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "seen", conversationId: activeId.value, sequence: last.sequence }));
  }

  async function blockPeer(value: boolean) {
    if (!active.value) return;
    blocked.value = value;
    if (accessToken.value) await $fetch(`/users/${active.value.peer.id}/block`, { method: value ? "PUT" : "DELETE", baseURL: base, headers: await chatHeaders() }).catch(() => undefined);
  }

  async function report(reason: string, details: string) {
    if (!activeId.value) return;
    if (accessToken.value) await $fetch(`/conversations/${activeId.value}/reports`, { method: "POST", baseURL: base, headers: await chatHeaders(), body: { reason, details } }).catch(() => undefined);
  }

  function mergeMessage(message: ChatMessageView) {
    const list = messages.value[message.conversationId] ?? [];
    const index = list.findIndex(item => item.clientMessageId === message.clientMessageId || item.id === message.id);
    if (index >= 0) list[index] = { ...list[index], ...message };
    else list.push(message);
    messages.value[message.conversationId] = [...list].sort((a, b) => a.sequence - b.sequence);
  }

  function removeMessage(clientMessageId: string) {
    messages.value[activeId.value] = timeline.value.filter((item: ChatMessageView) => item.clientMessageId !== clientMessageId);
  }

  function markFailed(clientMessageId: string) {
    const item = timeline.value.find((message: ChatMessageView) => message.clientMessageId === clientMessageId);
    if (item) item.delivery = "failed";
  }

  function markDeliverySeen(conversationId: string, sequence: number) {
    for (const item of messages.value[conversationId] ?? []) if (item.fromMe && item.sequence <= sequence) item.delivery = "seen";
  }

  function nextSequence() { return Math.max(0, ...timeline.value.map((item: ChatMessageView) => item.sequence)) + 1; }

  function updateConversationPreview(body: string, at: string) {
    const item = active.value;
    if (!item) return;
    item.lastMessage = body;
    item.lastMessageAt = at;
    conversations.value = [item, ...conversations.value.filter(conversation => conversation.id !== item.id)];
  }

  function queueCommand(command: Record<string, unknown>) {
    const queue = readQueue();
    queue.push(command);
    localStorage.setItem("haftsoo-chat-queue", JSON.stringify(queue.slice(-50)));
  }

  function readQueue(): Record<string, unknown>[] {
    try { return JSON.parse(localStorage.getItem("haftsoo-chat-queue") || "[]"); } catch { return []; }
  }

  function flushQueue() {
    if (socket?.readyState !== WebSocket.OPEN) return;
    const queue = readQueue();
    queue.forEach(command => socket?.send(JSON.stringify(command)));
    localStorage.removeItem("haftsoo-chat-queue");
  }

  function toConversationView(raw: any): ChatConversationView {
    return { id: String(raw.id), postToken: String(raw.postToken), title: raw.title || "گفتگوی آگهی", thumbnail: raw.thumbnail || "", peer: raw.peer || { id: raw.participantIds?.find((id: string) => id !== actorId) || "peer", name: "کاربر هفت‌سو", avatar: "ک", online: false, lastSeenLabel: "" }, lastMessage: raw.lastMessage || "", lastMessageAt: raw.lastMessageAt, unreadCount: Number(raw.unreadCount || 0), context: raw.context || "others_post" };
  }

  function toMessageView(raw: any): ChatMessageView {
    return { id: String(raw.id), conversationId: String(raw.conversationId), senderId: String(raw.senderId), clientMessageId: String(raw.clientMessageId), sequence: Number(raw.sequence), body: String(raw.body), createdAt: String(raw.createdAt), fromMe: raw.senderId === actorId || raw.fromMe === true, delivery: raw.delivery || "sent" };
  }

  onMounted(async () => {
    await restore();
    await loadConversations();
    if (requestedConversation.value) await openConversation(requestedConversation.value);
    if (authenticated.value) await connect(); else connection.value = "offline";
    window.addEventListener("online", connect);
    window.addEventListener("offline", () => { connection.value = "offline"; socket?.close(); });
  });
  onScopeDispose(() => { clearTimeout(reconnectTimer); socket?.close(); });

  return { active, activeId, blockPeer, blocked, connection, conversations, error, loadConversations, loadOlder, loadingOlder, markSeen, openConversation, pending, report, retry, send, setTyping, timeline, typing, unreadTotal };
}
