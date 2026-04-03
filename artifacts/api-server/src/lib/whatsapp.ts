import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import path from "path";
import { mkdirSync, existsSync } from "fs";

const SESSIONS_DIR = path.join(process.cwd(), "sessions");

if (!existsSync(SESSIONS_DIR)) {
  mkdirSync(SESSIONS_DIR, { recursive: true });
}

interface SessionEntry {
  socket: WASocket | null;
  qrCode: string | null;
  status: "offline" | "connecting" | "online";
  pairingCodeResolver: ((code: string) => void) | null;
}

const activeSessions = new Map<string, SessionEntry>();

function getSessionDir(userId: string) {
  const dir = path.join(SESSIONS_DIR, userId.replace(/[^a-zA-Z0-9_-]/g, "_"));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getOrCreateEntry(userId: string): SessionEntry {
  if (!activeSessions.has(userId)) {
    activeSessions.set(userId, {
      socket: null,
      qrCode: null,
      status: "offline",
      pairingCodeResolver: null,
    });
  }
  return activeSessions.get(userId)!;
}

async function startSocket(
  userId: string,
  entry: SessionEntry,
  onStatusChange?: (status: "offline" | "connecting" | "online") => void
): Promise<WASocket> {
  const sessionDir = getSessionDir(userId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    logger: {
      level: "silent",
      trace: () => {},
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      child: () => ({
        level: "silent",
        trace: () => {},
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => ({} as any),
        fatal: () => {},
      }),
      fatal: () => {},
    } as any,
  });

  entry.socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        entry.qrCode = await QRCode.toDataURL(qr, {
          width: 300,
          margin: 2,
          color: { dark: "#000000", light: "#ffffff" },
        });
      } catch {
        entry.qrCode = qr;
      }
      entry.status = "connecting";
      onStatusChange?.("connecting");
    }

    if (connection === "close") {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut;

      entry.status = "offline";
      entry.qrCode = null;
      entry.socket = null;
      onStatusChange?.("offline");

      if (shouldReconnect) {
        const newEntry = getOrCreateEntry(userId);
        await startSocket(userId, newEntry, onStatusChange);
      } else {
        activeSessions.delete(userId);
      }
    }

    if (connection === "open") {
      entry.status = "online";
      entry.qrCode = null;
      onStatusChange?.("online");
    }
  });

  return sock;
}

export async function requestQRCode(
  userId: string
): Promise<{ qrCode: string | null; status: string }> {
  const entry = getOrCreateEntry(userId);

  if (entry.status === "online") {
    return { qrCode: null, status: "online" };
  }

  if (entry.status === "connecting" && entry.qrCode) {
    return { qrCode: entry.qrCode, status: "connecting" };
  }

  if (!entry.socket) {
    await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 3000));
  }

  return {
    qrCode: entry.qrCode,
    status: entry.qrCode ? "connecting" : entry.status,
  };
}

export async function requestPairingCode(
  userId: string,
  phoneNumber: string
): Promise<string> {
  const entry = getOrCreateEntry(userId);

  const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 7) {
    throw new Error("Invalid phone number");
  }

  let sock = entry.socket;

  if (!sock || entry.status === "offline") {
    sock = await startSocket(userId, entry);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (entry.status === "online") {
    throw new Error("Already connected");
  }

  const code = await sock!.requestPairingCode(cleanPhone);
  return code;
}

export async function disconnectSession(userId: string): Promise<void> {
  const entry = activeSessions.get(userId);
  if (entry?.socket) {
    try {
      await entry.socket.logout();
    } catch {
    }
    entry.socket = null;
    entry.status = "offline";
    entry.qrCode = null;
  }
  activeSessions.delete(userId);

  const sessionDir = getSessionDir(userId);
  if (existsSync(sessionDir)) {
    const { rm } = await import("fs/promises");
    await rm(sessionDir, { recursive: true, force: true });
  }
}

export function getSessionStatus(userId: string): "offline" | "connecting" | "online" {
  return activeSessions.get(userId)?.status ?? "offline";
}
