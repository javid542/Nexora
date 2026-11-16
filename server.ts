import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { WebSocket, WebSocketServer } from 'ws';
import {
  type AvatarForm,
  HEADLINES,
  type MemoryItem,
  PERSONAS,
  RELEASE_INFO,
  type VoicePersonalityProfile,
  WORLD_HOTSPOTS,
} from './src/data/stonicData.ts';
import {
  buildBootstrapperScript,
  buildCharacterSystemPrompt,
  isValidPairingCode,
  normalizePairingCode,
} from './src/utils/stonicLogic.ts';

function parseCliArg(flag: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === flag && args[i + 1]) {
      return args[i + 1];
    }
    if (arg.startsWith(`${flag}=`)) {
      return arg.slice(flag.length + 1);
    }
  }
  return undefined;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const cliPort = Number(parseCliArg('--port'));
const PORT =
  Number.isFinite(cliPort) && cliPort > 0
    ? cliPort
    : isProduction
      ? Number(process.env.PORT || 3000)
      : 3000;
const HOST = parseCliArg('--host') || '0.0.0.0';

interface RemoteTranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface RemotePairingSession {
  code: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  status: 'awaiting_scan' | 'paired';
  callActive: boolean;
  desktopClients: Set<WebSocket>;
  mobileClients: Set<WebSocket>;
  transcript: RemoteTranscriptTurn[];
}

const pairingSessions = new Map<string, RemotePairingSession>();

function generatePairingCode(): string {
  const digits = Math.floor(1000 + Math.random() * 8999);
  return `NXR-${digits}-RMT`;
}

function createPairingSession(forcedCode?: string): RemotePairingSession {
  const code = forcedCode || generatePairingCode();
  const now = Date.now();
  const session: RemotePairingSession = {
    code,
    createdAtUtc: new Date(now).toISOString(),
    expiresAtUtc: new Date(now + 10 * 60 * 1000).toISOString(),
    status: 'awaiting_scan',
    callActive: false,
    desktopClients: new Set<WebSocket>(),
    mobileClients: new Set<WebSocket>(),
    transcript: [],
  };
  pairingSessions.set(code, session);
  if (pairingSessions.size > 200) {
    const oldestKey = pairingSessions.keys().next().value;
    if (oldestKey) pairingSessions.delete(oldestKey);
  }
  return session;
}

function serializeSession(session: RemotePairingSession) {
  return {
    code: session.code,
    createdAtUtc: session.createdAtUtc,
    expiresAtUtc: session.expiresAtUtc,
    status: session.status,
    callActive: session.callActive,
    desktopCount: session.desktopClients.size,
    mobileCount: session.mobileClients.size,
    transcript: session.transcript.slice(-24),
  };
}

function broadcastToSession(session: RemotePairingSession, payload: unknown) {
  const raw = JSON.stringify(payload);
  for (const sock of [...session.desktopClients, ...session.mobileClients]) {
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(raw);
    }
  }
}

function classifyGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const upper = raw.toUpperCase();
  if (upper.includes('429') || upper.includes('RESOURCE_EXHAUSTED') || upper.includes('QUOTA')) {
    return {
      status: 429,
      message:
        'Daily Gemini free-tier request limit reached. Select a billing-enabled API key in Settings > Secrets or retry later.',
    };
  }
  if (upper.includes('403') || upper.includes('PERMISSION_DENIED') || upper.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API key permission issue. Check your API key in Settings > Secrets.',
    };
  }
  return {
    status: 500,
    message: 'Unable to reach Gemini core right now. Please try again shortly.',
  };
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateCharacterReply(params: {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; text: string }>;
  personaId: string;
  avatarForm: AvatarForm;
  memories: MemoryItem[];
  customInstruction?: string;
  voiceProfile?: VoicePersonalityProfile;
}): Promise<{ reply: string; personaId: string }> {
  const persona = PERSONAS.find((p) => p.id === params.personaId) || PERSONAS[0];
  const systemInstruction = buildCharacterSystemPrompt(
    persona,
    params.avatarForm,
    Array.isArray(params.memories) ? params.memories : [],
    params.customInstruction || '',
    params.voiceProfile
  );

  const ai = createGeminiClient();
  if (!ai) {
    const err = new Error('GEMINI_API_KEY is not configured in environment secrets.');
    (err as Error & { statusCode?: number }).statusCode = 503;
    throw err;
  }

  const conversationHistory = Array.isArray(params.history)
    ? params.history
        .filter((turn) => turn && typeof turn.text === 'string' && turn.text.trim().length > 0)
        .slice(-8)
        .map((turn) => ({
          role: turn.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: turn.text.trim() }],
        }))
    : [];

  const contents = [
    ...conversationHistory,
    { role: 'user', parts: [{ text: params.message.trim() }] },
  ];

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  } catch (firstErr) {
    const classified = classifyGeminiError(firstErr);
    if (classified.status === 429 || classified.status === 403) {
      throw firstErr;
    }
    response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });
  }

  const reply = response.text?.trim();
  if (!reply) {
    const err = new Error('The AI character returned an empty response.');
    (err as Error & { statusCode?: number }).statusCode = 502;
    throw err;
  }

  return { reply, personaId: persona.id };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const hasGemini = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    res.json({
      ok: true,
      phase: 3,
      wsRelay: true,
      geminiConfigured: hasGemini,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/world/telemetry', (_req, res) => {
    res.json({
      utcNow: new Date().toISOString().slice(11, 19),
      hotspots: WORLD_HOTSPOTS,
      headlines: HEADLINES,
    });
  });

  app.get('/api/download/manifest', (_req, res) => {
    res.json({
      ...RELEASE_INFO,
      installerFilename: `NexoraAI-Setup-${RELEASE_INFO.version}.exe`,
      bootstrapperFilename: `NexoraAI-Setup-${RELEASE_INFO.version}-Bootstrapper.ps1`,
      checksumFilename: `NexoraAI-Setup-${RELEASE_INFO.version}.sha256`,
      bootstrapperUrl: '/api/download/bootstrapper',
      checksumUrl: '/api/download/checksum',
    });
  });

  app.get('/api/download/bootstrapper', (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers.host || `localhost:${PORT}`;
    const appUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : `${protocol}://${host}`;
    const script = buildBootstrapperScript({
      version: RELEASE_INFO.version,
      sha256: RELEASE_INFO.sha256,
      appUrl,
    });
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="NexoraAI-Setup-${RELEASE_INFO.version}-Bootstrapper.ps1"`
    );
    res.send(script);
  });

  app.get('/api/download/checksum', (_req, res) => {
    const content = `${RELEASE_INFO.sha256} *NexoraAI-Setup-${RELEASE_INFO.version}.exe\n`;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="NexoraAI-Setup-${RELEASE_INFO.version}.sha256"`
    );
    res.send(content);
  });

  app.post('/api/remote/pair', (_req, res) => {
    const session = createPairingSession();
    res.json(serializeSession(session));
  });

  app.get('/api/remote/status/:code', (req, res) => {
    const code = normalizePairingCode(String(req.params.code || ''));
    const existing = pairingSessions.get(code);
    if (!existing) {
      res.status(404).json({ error: 'Pairing code expired or unknown.' });
      return;
    }
    res.json(serializeSession(existing));
  });

  app.post('/api/character/chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        personaId = 'jarvis',
        avatarForm = 'female',
        memories = [],
        customInstruction = '',
        voiceProfile,
      } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        personaId?: string;
        avatarForm?: AvatarForm;
        memories?: MemoryItem[];
        customInstruction?: string;
        voiceProfile?: VoicePersonalityProfile;
      };

      if (!message || !message.trim()) {
        res.status(400).json({ error: 'Message cannot be empty.' });
        return;
      }

      const result = await generateCharacterReply({
        message,
        history,
        personaId,
        avatarForm,
        memories,
        customInstruction,
        voiceProfile,
      });

      res.json(result);
    } catch (error) {
      const statusCode = (error as Error & { statusCode?: number }).statusCode;
      if (statusCode) {
        res.status(statusCode).json({ error: (error as Error).message });
        return;
      }
      const classified = classifyGeminiError(error);
      res.status(classified.status).json({ error: classified.message });
    }
  });

  app.post('/api/presales/ask', async (req, res) => {
    try {
      const { question } = req.body as { question?: string };
      if (!question || !question.trim()) {
        res.status(400).json({ error: 'Please enter a question.' });
        return;
      }

      const ai = createGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'GEMINI_API_KEY is not configured in environment secrets.',
        });
        return;
      }

      const systemInstruction = `You are the NexoraAI.com pre-purchase guide. Answer visitor questions clearly, honestly, and concisely (2-4 sentences).
Facts about NexoraAI:
- NexoraAI is a spatial voice & ambient 3D desktop companion for Windows 10 and Windows 11 (x64). macOS support is in preparation.
- It blends reactive Core moods (Standby, Focus, Briefing, Night), persistent structured memory, a live UTC World Monitor radar, and local-first microphone isolation.
- Pricing: Lifetime Gen 3 is $56 one-time for up to 3 Windows PCs and includes your first month of Nexora Cloud free.
- After the free first month, you can either bring your own API keys (BYOK with zero platform limits) OR subscribe to Nexora Cloud: Basic ($19/mo) or Power ($49/mo, ~3.5x usage).
- Nexora Remote lets you call your PC's companion from your phone using an NXR-XXXX-RMT QR pairing code while your PC is online.
- Security: Strict push-to-talk / session mic gating, zero silent background audio recording, and published SHA-256 checksums for every installer.
- Payment methods: Card (instant activation), Bank Transfer, JazzCash, USDT, Binance Pay, Redot Pay.
- Refund policy: Lifetime is final sale once delivered, except we refund in full if we cannot get download, install, or sign-in working for you.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: question.trim(),
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      res.json({ answer: response.text?.trim() || 'Feel free to explore the FAQ or Pricing page for more details.' });
    } catch (error) {
      const classified = classifyGeminiError(error);
      res.status(classified.status).json({ error: classified.message });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws/remote' });

  wss.on('connection', (ws) => {
    let joinedCode: string | null = null;
    let joinedRole: 'desktop' | 'mobile' | null = null;

    ws.on('message', async (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        return;
      }

      if (msg.type === 'join') {
        const code = normalizePairingCode(String(msg.code || ''));
        const role = msg.role === 'desktop' ? 'desktop' : 'mobile';
        if (!isValidPairingCode(code)) {
          ws.send(JSON.stringify({ type: 'remote:error', error: 'Invalid pairing code format.' }));
          return;
        }

        let session = pairingSessions.get(code);
        if (!session) {
          session = createPairingSession(code);
        }

        // Remove from prior session if re-joining cleanly
        if (joinedCode && joinedRole) {
          const prev = pairingSessions.get(joinedCode);
          if (prev) {
            if (joinedRole === 'desktop') prev.desktopClients.delete(ws);
            else prev.mobileClients.delete(ws);
          }
        }

        joinedCode = code;
        joinedRole = role;

        if (role === 'desktop') {
          session.desktopClients.add(ws);
        } else {
          session.mobileClients.add(ws);
          session.status = 'paired';
          session.callActive = true;
        }

        broadcastToSession(session, {
          type: 'session:state',
          session: serializeSession(session),
        });
        return;
      }

      if (msg.type === 'remote:end') {
        const code = normalizePairingCode(String(msg.code || joinedCode || ''));
        const session = pairingSessions.get(code);
        if (!session) return;
        session.callActive = false;
        broadcastToSession(session, {
          type: 'session:state',
          session: serializeSession(session),
        });
        return;
      }

      if (msg.type === 'remote:message') {
        const code = normalizePairingCode(String(msg.code || joinedCode || ''));
        const session = pairingSessions.get(code);
        if (!session) {
          ws.send(JSON.stringify({ type: 'remote:error', error: 'Session expired. Re-pair to continue.' }));
          return;
        }
        const text = String(msg.text || '').trim().slice(0, 500);
        if (!text) return;

        const clientMsgId = String(msg.clientMsgId || `u-${Date.now()}`);
        if (!session.transcript.some((t) => t.id === clientMsgId)) {
          const userTurn: RemoteTranscriptTurn = {
            id: clientMsgId,
            role: 'user',
            text,
            timestamp: new Date().toISOString().slice(11, 19),
          };
          session.transcript.push(userTurn);
          if (session.transcript.length > 40) session.transcript.shift();
          broadcastToSession(session, { type: 'remote:transcript', turn: userTurn });
        }

        try {
          const personaId = String(msg.personaId || 'jarvis');
          const avatarForm: AvatarForm =
            msg.avatarForm === 'core' || msg.avatarForm === 'male' ? msg.avatarForm : 'female';
          const memories = Array.isArray(msg.memories) ? (msg.memories as MemoryItem[]) : [];

          const result = await generateCharacterReply({
            message: text,
            history: session.transcript.slice(-8).map((t) => ({ role: t.role, text: t.text })),
            personaId,
            avatarForm,
            memories,
          });

          const replyTurn: RemoteTranscriptTurn = {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: result.reply,
            timestamp: new Date().toISOString().slice(11, 19),
          };
          session.transcript.push(replyTurn);
          if (session.transcript.length > 40) session.transcript.shift();
          broadcastToSession(session, { type: 'remote:transcript', turn: replyTurn });
        } catch (error) {
          const statusCode = (error as Error & { statusCode?: number }).statusCode;
          const errMessage = statusCode
            ? (error as Error).message
            : classifyGeminiError(error).message;
          broadcastToSession(session, { type: 'remote:error', error: errMessage });
        }
      }
    });

    ws.on('close', () => {
      if (!joinedCode || !joinedRole) return;
      const session = pairingSessions.get(joinedCode);
      if (!session) return;
      if (joinedRole === 'desktop') {
        session.desktopClients.delete(ws);
      } else {
        session.mobileClients.delete(ws);
        if (session.mobileClients.size === 0) {
          session.callActive = false;
        }
      }
      broadcastToSession(session, {
        type: 'session:state',
        session: serializeSession(session),
      });
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`NexoraAI.com server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start NexoraAI server:', err);
  process.exit(1);
});

