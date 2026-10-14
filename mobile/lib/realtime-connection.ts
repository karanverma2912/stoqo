export type RealtimeSocket = Pick<
  WebSocket,
  "send" | "close" | "onopen" | "onmessage" | "onclose" | "onerror"
>;

type Options = {
  businessId: number;
  getTicket: () => Promise<string>;
  socketUrl: (ticket: string) => string;
  createSocket: (url: string) => RealtimeSocket;
  onConnected: (connected: boolean) => void;
  onEvent: (event: { type?: string; business_id?: number }) => void;
  onAccessChanged: () => void;
};

// Retired tickets and socket callbacks must never reconnect after navigation.
export function createRealtimeConnection(options: Options) {
  let active = false,
    stopped = false,
    connecting = false,
    generation = 0,
    attempt = 0,
    socket: RealtimeSocket | undefined,
    retryTimer: ReturnType<typeof setTimeout> | undefined,
    handshakeTimer: ReturnType<typeof setTimeout> | undefined;
  const identifiers = [
    JSON.stringify({
      channel: "WorkspaceChannel",
      business_id: options.businessId,
    }),
    JSON.stringify({ channel: "UserChannel" }),
  ];

  function close() {
    clearTimeout(handshakeTimer);
    handshakeTimer = undefined;
    connecting = false;
    const previous = socket;
    socket = undefined;
    if (previous) {
      previous.onopen =
        previous.onmessage =
        previous.onclose =
        previous.onerror =
          null;
      previous.close();
    }
    options.onConnected(false);
  }

  function retry() {
    if (!active || stopped || retryTimer) return;
    retryTimer = setTimeout(
      () => {
        retryTimer = undefined;
        void connect();
      },
      Math.min(30000, 1000 * 2 ** attempt++),
    );
  }

  function failed() {
    generation++;
    close();
    retry();
  }

  async function connect() {
    if (!active || stopped || connecting || socket) return;
    connecting = true;
    const current = ++generation;
    const isCurrent = () => active && !stopped && generation === current;
    try {
      const ticket = await options.getTicket();
      if (!isCurrent()) return;
      const connection = options.createSocket(options.socketUrl(ticket));
      socket = connection;
      connecting = false;
      const confirmed = new Set<string>();
      handshakeTimer = setTimeout(() => {
        if (isCurrent()) failed();
      }, 10000);
      connection.onopen = () => {
        if (!isCurrent()) return;
        try {
          for (const identifier of identifiers)
            connection.send(
              JSON.stringify({ command: "subscribe", identifier }),
            );
        } catch {
          failed();
        }
      };
      connection.onmessage = (message) => {
        if (!isCurrent()) return;
        try {
          const frame = JSON.parse(message.data);
          if (
            frame.type === "confirm_subscription" &&
            identifiers.includes(frame.identifier)
          ) {
            confirmed.add(frame.identifier);
            if (confirmed.size === identifiers.length) {
              clearTimeout(handshakeTimer);
              handshakeTimer = undefined;
              attempt = 0;
              options.onConnected(true);
            }
          } else if (frame.type === "reject_subscription") {
            options.onAccessChanged();
            failed();
          } else if (frame.type === "disconnect") {
            if (frame.reconnect === false) {
              active = false;
              generation++;
              close();
              options.onAccessChanged();
            } else failed();
          } else if (frame.message && typeof frame.message === "object") {
            options.onEvent(frame.message);
          }
        } catch {
          // Malformed protocol frames must not expose server details.
        }
      };
      connection.onclose = connection.onerror = () => {
        if (isCurrent()) failed();
      };
    } catch {
      if (isCurrent()) failed();
    }
  }

  function suspend() {
    active = false;
    generation++;
    clearTimeout(retryTimer);
    retryTimer = undefined;
    close();
  }

  return {
    resume() {
      if (active || stopped) return;
      active = true;
      void connect();
    },
    suspend,
    stop() {
      stopped = true;
      suspend();
    },
  };
}
