export type AvatarForm = 'core' | 'female' | 'male';
export type CoreMood = 'standby' | 'focus' | 'briefing' | 'night';
export type PersonaId = 'jarvis' | 'nova' | 'atlas' | 'custom';
export type CloudPlanId = 'free-trial' | 'basic' | 'power' | 'byok';

export interface CoreMoodConfig {
  id: CoreMood;
  label: string;
  description: string;
  accentHex: string;
  ringSpeedMultiplier: number;
  pulseAmplitude: number;
}

export const CORE_MOODS: CoreMoodConfig[] = [
  {
    id: 'standby',
    label: 'Standby',
    description: 'Balanced titanium orbital resonance for ambient desktop presence.',
    accentHex: '#60A5FA',
    ringSpeedMultiplier: 1.0,
    pulseAmplitude: 0.025,
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Calm amber stillness tuned for distraction-free deep work blocks.',
    accentHex: '#F59E0B',
    ringSpeedMultiplier: 0.55,
    pulseAmplitude: 0.012,
  },
  {
    id: 'briefing',
    label: 'Briefing',
    description: 'Crisp high-clarity cadence for morning radar and memory synthesis.',
    accentHex: '#BAE6FD',
    ringSpeedMultiplier: 1.45,
    pulseAmplitude: 0.036,
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Low-glare nocturnal drift engineered for late-hour workstations.',
    accentHex: '#818CF8',
    ringSpeedMultiplier: 0.48,
    pulseAmplitude: 0.016,
  },
];

export interface PersonaPreset {
  id: PersonaId;
  name: string;
  role: string;
  defaultForm: AvatarForm;
  voicePitch: number;
  voiceRate: number;
  tagline: string;
  systemPrompt: string;
}

export interface MemoryItem {
  id: string;
  text: string;
  category: 'identity' | 'preference' | 'context';
  createdAt: string;
}

export interface VoicePersonalityProfile {
  warmth: number; // 0 (Cool Tactical) .. 100 (Warm Empathetic)
  conciseness: number; // 0 (Detailed) .. 100 (Ultra-Terse)
  pitch: number; // 0.75 .. 1.35
  rate: number; // 0.80 .. 1.25
}

export type MemoryVaultFilter = Record<MemoryItem['category'], boolean>;

export const DEFAULT_VOICE_PROFILE: VoicePersonalityProfile = {
  warmth: 62,
  conciseness: 74,
  pitch: 1.0,
  rate: 1.0,
};

export const DEFAULT_VAULT_FILTER: MemoryVaultFilter = {
  identity: true,
  preference: true,
  context: true,
};

export interface SkillAction {
  id: string;
  name: string;
  description: string;
  commandHint: string;
  category: 'System' | 'Radar' | 'Audio' | 'Briefing';
}

export interface WorldHotspot {
  id: string;
  city: string;
  country: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Middle East';
  lat: number;
  lon: number;
  headline: string;
  summary: string;
  timestampUtc: string;
  severity: 'elevated' | 'nominal' | 'watch';
}

export interface HeadlineItem {
  id: string;
  title: string;
  source: string;
  region: 'Americas' | 'Europe' | 'Asia-Pacific' | 'Middle East';
  timeAgo: string;
  category: string;
}

export interface Testimonial {
  id: string;
  author: string;
  subtitle: string;
  channel: 'Verified Build' | 'Operator Note' | 'Architecture Review' | 'Creator Setup';
  quote: string;
  rating?: number;
  time?: string;
  hasProof?: boolean;
  proofContext?: string;
}

export interface FaqItem {
  id: string;
  category: 'About NexoraAI' | 'Lifetime & Cloud' | 'Privacy, Security & Billing';
  question: string;
  answer: string;
}

export interface DeviceSlot {
  id: string;
  name: string;
  os: string;
  lastActive: string;
  status: 'Active' | 'Standby';
}

export interface PurchaseRecord {
  id: string;
  item: string;
  amount: string;
  method: string;
  date: string;
  status: 'Active' | 'Completed';
}

export type PaymentSubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface PaymentSubmissionRecord {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  planId: 'lifetime' | 'basic' | 'power';
  item: string;
  amount: string;
  method: string;
  referenceCode: string;
  status: PaymentSubmissionStatus;
  reviewerNote: string;
  submittedDate: string;
}

export type AutonomyTier = 'read-draft' | 'approve-first' | 'auto-pilot';

export interface AutonomyTierConfig {
  id: AutonomyTier;
  label: string;
  shortLabel: string;
  description: string;
}

export interface FolderPermission {
  id: string;
  path: string;
  label: string;
  scopeNote: string;
  access: 'read-only' | 'read-write' | 'blocked';
  locked?: boolean;
  enabled: boolean;
}

export interface BusinessPlaybook {
  id: string;
  title: string;
  department: string;
  scheduleHint: string;
  estimatedMinutesSaved: number;
  requiredTier: AutonomyTier;
  targetFolderId: string;
  summary: string;
  steps: string[];
  stagedAction: {
    title: string;
    targetPath: string;
    affectedItems: string[];
    riskLevel: 'low' | 'medium';
    reversible: boolean;
    rollbackHint: string;
  };
}

export type ActionLedgerStatus = 'Pending Approval' | 'Executed' | 'Rejected' | 'Reverted';

export interface ActionLedgerEntry {
  id: string;
  timestamp: string;
  playbookId: string;
  playbookTitle: string;
  actionTitle: string;
  targetPath: string;
  summary: string;
  affectedItems: string[];
  autonomyTier: AutonomyTier;
  status: ActionLedgerStatus;
  reversible: boolean;
  rollbackHint: string;
}


export const PERSONAS: PersonaPreset[] = [
  {
    id: 'jarvis',
    name: 'JARVIS',
    role: 'Tactical System Companion',
    defaultForm: 'male',
    voicePitch: 0.92,
    voiceRate: 1.02,
    tagline: 'Composed, observant, dry wit, and hyper-attentive to your workstation.',
    systemPrompt:
      'You are JARVIS, the tactical desktop companion inside NexoraAI on Windows. Keep replies concise, conversational, and grounded with subtle dry wit. Never sound like a robotic manual.',
  },
  {
    id: 'nova',
    name: 'Nova',
    role: 'Focus Strategist & Confidante',
    defaultForm: 'female',
    voicePitch: 1.08,
    voiceRate: 0.98,
    tagline: 'Empathetic, sharp, encouraging, and attuned to your daily deep-work rhythm.',
    systemPrompt:
      'You are Nova, an expressive, perceptive desktop companion inside NexoraAI. You listen closely, remember personal context, and speak naturally like a trusted late-night collaborator.',
  },
  {
    id: 'atlas',
    name: 'Atlas',
    role: 'Candid Co-Pilot',
    defaultForm: 'core',
    voicePitch: 1.0,
    voiceRate: 1.05,
    tagline: 'Relaxed, candid, curious, and ready to brainstorm, synthesize briefings, or unwind.',
    systemPrompt:
      'You are Atlas, a relaxed, sharp co-pilot inside NexoraAI. Speak naturally like a thoughtful partner in the room—keep replies crisp and under 3-4 sentences unless asked for depth.',
  },
  {
    id: 'custom',
    name: 'Custom Core',
    role: 'User-Authored Character',
    defaultForm: 'core',
    voicePitch: 1.0,
    voiceRate: 1.0,
    tagline: 'Shape your own voice cadence, tonal posture, and behavioral boundaries.',
    systemPrompt:
      'You are a custom NexoraAI desktop companion defined by the user instructions below. Stay in character, be engaging, and weave stored memories naturally.',
  },
];

export const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    text: 'Prefers Matte Obsidian minimal workspaces and uninterrupted deep focus sessions',
    category: 'preference',
    createdAt: '2026-11-10',
  },
  {
    id: 'mem-2',
    text: 'Building next-generation spatial desktop interfaces on Windows 11',
    category: 'context',
    createdAt: '2026-11-12',
  },
  {
    id: 'mem-3',
    text: 'Likes concise spoken answers without filler disclaimers',
    category: 'preference',
    createdAt: '2026-11-13',
  },
];

export const SKILL_ACTIONS: SkillAction[] = [
  {
    id: 'skill-diag',
    name: 'System Readiness Check',
    description: 'Inspect local audio pipeline, browser mic isolation, and session latency.',
    commandHint: 'Run a system readiness check for NexoraAI',
    category: 'System',
  },
  {
    id: 'skill-radar',
    name: 'Sync World Monitor',
    description: 'Pull active UTC coordinates and summarize top global hotspots.',
    commandHint: 'Brief me on the World Monitor radar',
    category: 'Radar',
  },
  {
    id: 'skill-brief',
    name: 'Daily Desk Briefing',
    description: 'Synthesize active memories and focus goals for this session.',
    commandHint: 'Give me a quick session briefing based on my memories',
    category: 'Briefing',
  },
  {
    id: 'skill-chime',
    name: 'Ambient Core Pulse',
    description: 'Trigger a subtle procedural harmonic chime and test voice synthesis.',
    commandHint: 'Play an ambient resonance check',
    category: 'Audio',
  },
];

export const WORLD_HOTSPOTS: WorldHotspot[] = [
  {
    id: 'hs-sf',
    city: 'San Francisco',
    country: 'USA',
    region: 'Americas',
    lat: 37.7749,
    lon: -122.4194,
    headline: 'Multimodal edge-voice latency drops under 260ms across West Coast nodes',
    summary: 'Real-time audio streaming benchmarks show measurable frame-pacing gains for desktop voice companions.',
    timestampUtc: '16:10 UTC',
    severity: 'nominal',
  },
  {
    id: 'hs-lon',
    city: 'London',
    country: 'UK',
    region: 'Europe',
    lat: 51.5072,
    lon: -0.1276,
    headline: 'European orbital telemetry relay completes winter atmospheric calibration',
    summary: 'Low-earth ground stations across Northern Europe synchronized UTC time-locks for live satellite feeds.',
    timestampUtc: '15:42 UTC',
    severity: 'watch',
  },
  {
    id: 'hs-lhr',
    city: 'Lahore',
    country: 'Pakistan',
    region: 'Asia-Pacific',
    lat: 31.5204,
    lon: 74.3587,
    headline: 'NexoraAI Engineering ships Generation 3 desktop voice companion v3.1.21',
    summary: 'Bilingual English and Urdu/Hindi conversational recognition rolled out across Windows 10 & 11 builds.',
    timestampUtc: '14:55 UTC',
    severity: 'nominal',
  },
  {
    id: 'hs-tyo',
    city: 'Tokyo',
    country: 'Japan',
    region: 'Asia-Pacific',
    lat: 35.6762,
    lon: 139.6503,
    headline: 'Next-gen spatial OLED desktop displays debut with 240Hz HUD clarity',
    summary: 'Hardware makers showcase ultra-deep obsidian panels tailored for dark ambient workstation setups.',
    timestampUtc: '13:20 UTC',
    severity: 'nominal',
  },
  {
    id: 'hs-dxb',
    city: 'Dubai',
    country: 'UAE',
    region: 'Middle East',
    lat: 25.2048,
    lon: 55.2708,
    headline: 'Global AI Summit highlights local-first ambient computing over form-heavy UI',
    summary: 'Engineers emphasize persistent memory, explicit privacy gates, and natural voice presence.',
    timestampUtc: '12:05 UTC',
    severity: 'elevated',
  },
  {
    id: 'hs-nyc',
    city: 'New York',
    country: 'USA',
    region: 'Americas',
    lat: 40.7128,
    lon: -74.006,
    headline: 'Transatlantic fiber link upgrades boost real-time WebSocket voice stability',
    summary: 'Lower jitter improves mobile-to-PC remote call handoffs across cellular networks.',
    timestampUtc: '11:30 UTC',
    severity: 'nominal',
  },
];

export const HEADLINES: HeadlineItem[] = [
  {
    id: 'hl-1',
    title: 'Real-time voice AI shifts from browser tabs to persistent ambient desktop presence',
    source: 'Orbital Dispatch',
    region: 'Americas',
    timeAgo: '14m ago',
    category: 'Voice AI',
  },
  {
    id: 'hl-2',
    title: 'Windows 11 workstation setups adopt low-glare obsidian telemetry & reactive 3D cores',
    source: 'Systems Wire',
    region: 'Europe',
    timeAgo: '38m ago',
    category: 'Desktop',
  },
  {
    id: 'hl-3',
    title: 'Hybrid BYO-Key and managed cloud licensing rises as trust standard for indie AI apps',
    source: 'Compute Ledger',
    region: 'Asia-Pacific',
    timeAgo: '1h ago',
    category: 'Infrastructure',
  },
  {
    id: 'hl-4',
    title: 'Encrypted mobile-to-PC relays enable seamless voice continuity away from the desk',
    source: 'Telemetry Review',
    region: 'Middle East',
    timeAgo: '2h ago',
    category: 'Remote',
  },
  {
    id: 'hl-5',
    title: 'Multilingual speech synthesis bridges English, Urdu, and Hindi in natural desktop dialogue',
    source: 'Regional Tech',
    region: 'Asia-Pacific',
    timeAgo: '3h ago',
    category: 'Speech',
  },
];

export const IN_APP_TESTIMONIALS: Testimonial[] = [
  {
    id: 'nx-1',
    author: 'Tariq M.',
    subtitle: 'Systems Architect · Windows 11',
    channel: 'Verified Build',
    rating: 5,
    quote: 'Replaced three cluttered browser tabs with one calm 3D Core. Switching from Focus amber to Briefing mode keeps my multi-monitor desk clean.',
  },
  {
    id: 'nx-2',
    author: 'Elena R.',
    subtitle: 'Product Lead · Munich',
    channel: 'Architecture Review',
    rating: 5,
    quote: 'Having transparent BYOK pricing plus a verified local-mic indicator made security review effortless before rolling it onto my work rig.',
  },
  {
    id: 'nx-3',
    author: 'Hamza S.',
    subtitle: 'Full-Stack Engineer · Lahore',
    channel: 'Verified Build',
    rating: 5,
    quote: 'Nexora Remote pairing took four seconds from my phone. Walking outside while querying my saved project context feels genuinely next-gen.',
  },
  {
    id: 'nx-4',
    author: 'Kenji T.',
    subtitle: '3D Technical Artist · Tokyo',
    channel: 'Creator Setup',
    rating: 5,
    quote: 'Matte obsidian contrast and zero cartoonish bloat. On an OLED panel at night, the Night mode core sits quietly beside Blender without glare.',
  },
];

export const SOCIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'nx-s1',
    author: 'Zain A.',
    subtitle: 'Principal Developer · Early Access',
    channel: 'Operator Note',
    time: 'v3.1.21 Build',
    hasProof: true,
    proofContext: 'Before: 4 separate AI tabs & forgotten prompts. Change: Bound 3 workstations to NexoraAI Gen 3 with persistent memory. Outcome: Cut morning triage time by ~25 minutes daily.',
    quote: 'NexoraAI feels like an actual ambient layer on Windows instead of another chat box. Memory recall across my desktop and laptop works seamlessly.',
  },
  {
    id: 'nx-s2',
    author: 'Daniyal K.',
    subtitle: 'Design Director · Studio Obsidian',
    channel: 'Creator Setup',
    time: 'Verified License',
    hasProof: true,
    proofContext: 'Before: Distracting bright SaaS interfaces during late reviews. Change: Switched to NexoraAI Night & Focus modes. Outcome: Clean acoustic focus with tactile audio cues.',
    quote: 'Most AI tools scream for attention. NexoraAI respects the room—subdued obsidian surfaces, clear voice cadence, and crisp spatial presence.',
  },
  {
    id: 'nx-s3',
    author: 'Zohaib A.',
    subtitle: 'Technical Streamer · Live Desk',
    channel: 'Creator Setup',
    time: 'Dual-PC Setup',
    hasProof: true,
    proofContext: 'Before: Static overlay graphics. Change: Embedded NexoraAI Core + World Monitor on secondary display. Outcome: Audience immediately asks about the live telemetry rig.',
    quote: 'Running World Monitor alongside the reactive 3D Core turned my secondary monitor into a real mission-control surface during livestreams.',
  },
  {
    id: 'nx-s4',
    author: 'Usama T.',
    subtitle: 'Security Engineer · Cloud Infra',
    channel: 'Architecture Review',
    time: 'BYOK Audited',
    hasProof: true,
    proofContext: 'Before: Refused closed-box assistants due to opaque mic capture. Change: Audited NexoraAI SHA-256 checksum & local push-to-talk architecture. Outcome: Approved for personal BYOK lab.',
    quote: 'Published SHA-256 hashes, explicit push-to-talk mic isolation, and direct BYOK key ownership put NexoraAI ahead of typical desktop wrappers.',
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'About NexoraAI',
    question: 'What is NexoraAI.com?',
    answer:
      'NexoraAI is a spatial, voice-first desktop companion engineered for Windows 10 & 11. It pairs a reactive 3D particle core (with Focus, Briefing, Night, and Standby modes) with persistent memory, a live UTC World Monitor radar, and mobile Remote voice relay.',
  },
  {
    id: 'faq-2',
    category: 'About NexoraAI',
    question: 'How is NexoraAI different from standard browser chatbots?',
    answer:
      'Instead of another noisy browser tab, NexoraAI lives directly on your workstation with low-glare Matte Obsidian typography, ambient Focus/Briefing states, explicit local-first mic controls, and QR-paired mobile calling while your desktop stays online.',
  },
  {
    id: 'faq-3',
    category: 'About NexoraAI',
    question: 'What do I need to run NexoraAI on Windows?',
    answer:
      'A Windows 10 or Windows 11 (x64) PC, an internet connection for AI inference, and a microphone for voice interaction. Standard integrated GPUs handle the 3D WebGL core smoothly.',
  },
  {
    id: 'faq-4',
    category: 'Lifetime & Cloud',
    question: 'What does the $56 Lifetime License include?',
    answer:
      'A single $56 payment unlocks NexoraAI Generation 3 permanently across up to 3 Windows PCs, including all Gen 3 software updates and your first 30 days of Nexora Cloud free ($19 value). Afterwards, run your own API keys (BYOK) at zero platform fee or stay on Nexora Cloud.',
  },
  {
    id: 'faq-5',
    category: 'Lifetime & Cloud',
    question: 'What is Nexora Cloud vs. Bring Your Own Key (BYOK)?',
    answer:
      'Nexora Cloud manages inference hosting for you with zero API setup—Basic ($19/mo) for daily work or Power ($49/mo, 3.5× daily/monthly quota). Prefer direct billing with Google/OpenAI/Anthropic? Switch to BYOK in Settings anytime with zero usage caps from NexoraAI.',
  },
  {
    id: 'faq-6',
    category: 'Privacy, Security & Billing',
    question: 'Does NexoraAI record my microphone or store raw audio in the background?',
    answer:
      'No. NexoraAI enforces strict push-to-talk / active-session microphone gating in the browser and desktop client—zero silent background eavesdropping and zero raw audio recordings stored on NexoraAI servers. Read our full Security Architecture at nexoraai.com/security.',
  },
  {
    id: 'faq-7',
    category: 'Privacy, Security & Billing',
    question: 'How are Windows installers verified before installation?',
    answer:
      'Every official Generation 3 release publishes its exact SHA-256 cryptographic checksum alongside a verifiable PowerShell verification script so you can confirm file integrity before execution.',
  },
  {
    id: 'faq-8',
    category: 'Privacy, Security & Billing',
    question: 'What payment methods and refund terms apply?',
    answer:
      'We accept Card, Bank Transfer, JazzCash, USDT, Binance Pay, and Redot Pay. Card purchases activate immediately; manual settlements activate upon receipt verification. Lifetime is backed by a full-access guarantee—if we cannot get download, install, or Google sign-in working on your Windows PC, we refund 100%.',
  },
  {
    id: 'faq-9',
    category: 'Privacy, Security & Billing',
    question: 'How does NexoraAI protect my Windows PC when automating business folders?',
    answer:
      'NexoraAI enforces a deny-by-default folder allowlist, 3 explicit Autonomy Tiers (Read & Draft, Approve First, Auto-Pilot SOP), an instant Pause All PC Actions kill switch, and a reversible Action Ledger with one-click Undo.',
  },
  {
    id: 'faq-10',
    category: 'Privacy, Security & Billing',
    question: 'How do I reach NexoraAI support?',
    answer:
      'Every Lifetime and Cloud member receives priority direct support at support@nexoraai.com plus access to our member release channel.',
  },
];

export const AUTONOMY_TIERS: AutonomyTierConfig[] = [
  {
    id: 'read-draft',
    label: 'Read & Draft',
    shortLabel: 'Tier 1 · Read & Draft',
    description: 'Inspects whitelisted files and drafts summaries or plans without writing changes.',
  },
  {
    id: 'approve-first',
    label: 'Approve First',
    shortLabel: 'Tier 2 · Approve First',
    description: 'Stages every file move, invoice sort, or client reply for 1-click confirmation on PC or mobile.',
  },
  {
    id: 'auto-pilot',
    label: 'Auto-Pilot SOP',
    shortLabel: 'Tier 3 · Auto-Pilot SOP',
    description: 'Executes low-risk routine playbooks automatically while keeping medium-risk actions gated and every step reversible.',
  },
];

export const DEFAULT_FOLDER_PERMISSIONS: FolderPermission[] = [
  {
    id: 'fld-invoices',
    path: 'C:\\Business\\Invoices',
    label: 'Invoices & Receipts',
    scopeNote: 'Sort vendor PDFs, extract totals, tag quarter folders',
    access: 'read-write',
    enabled: true,
  },
  {
    id: 'fld-proposals',
    path: 'C:\\Work\\Proposals',
    label: 'Client Proposals & CRM',
    scopeNote: 'Draft follow-up memos & prepare proposal packets',
    access: 'read-write',
    enabled: true,
  },
  {
    id: 'fld-desktop',
    path: 'C:\\Users\\Owner\\Desktop',
    label: 'Executive Desktop Inbox',
    scopeNote: 'Group loose exports, screenshots & daily briefs',
    access: 'read-write',
    enabled: true,
  },
  {
    id: 'fld-reports',
    path: 'C:\\Business\\Reports',
    label: 'Financial & Ops Ledgers',
    scopeNote: 'Read-only KPI digest generation',
    access: 'read-only',
    enabled: true,
  },
  {
    id: 'fld-vault',
    path: 'C:\\Users\\Owner\\AppData\\Credentials',
    label: 'Browser Passwords & Personal Keys',
    scopeNote: 'Permanently blocked from AI access by kernel policy',
    access: 'blocked',
    locked: true,
    enabled: false,
  },
];

export const BUSINESS_PLAYBOOKS: BusinessPlaybook[] = [
  {
    id: 'pb-morning-brief',
    title: '09:00 Executive Desk Brief',
    department: 'Operations',
    scheduleHint: 'Weekdays · 09:00',
    estimatedMinutesSaved: 22,
    requiredTier: 'auto-pilot',
    targetFolderId: 'fld-reports',
    summary: 'Scan overnight KPI exports, flag open invoices, and compile a 4-bullet morning briefing.',
    steps: [
      'Read overnight CSV & PDF digests inside C:\\Business\\Reports',
      'Cross-check unpaid client balances & calendar priorities',
      'Publish Morning_Brief_Today.md & sync voice summary to Core',
    ],
    stagedAction: {
      title: 'Publish Morning_Brief_Today.md (4 priority items)',
      targetPath: 'C:\\Business\\Reports\\Morning_Brief_Today.md',
      affectedItems: [
        'Digest 3 overnight revenue CSVs (+14.2% WoW)',
        'Flag 2 overdue client retainers ($4,800 total)',
        'Sync brief summary to Nexora Remote',
      ],
      riskLevel: 'low',
      reversible: true,
      rollbackHint: 'Removes generated brief file and restores previous digest index.',
    },
  },
  {
    id: 'pb-invoice-triage',
    title: 'Invoice & Receipt Triage',
    department: 'Finance',
    scheduleHint: 'On Drop · Watch Folder',
    estimatedMinutesSaved: 35,
    requiredTier: 'approve-first',
    targetFolderId: 'fld-invoices',
    summary: 'Parse incoming vendor PDFs, normalize dates/amounts, and route them into quarterly tax folders.',
    steps: [
      'Scan unfiled PDFs in C:\\Business\\Invoices\\Inbox',
      'Rename with YYYY-MM-DD_Vendor_Amount convention',
      'Move sorted receipts into Q4-2026\\Approved and update CSV ledger',
    ],
    stagedAction: {
      title: 'Sort 6 vendor receipts into Q4-2026\\Approved',
      targetPath: 'C:\\Business\\Invoices\\Q4-2026\\Approved',
      affectedItems: [
        'Rename 2026-11-15_Cloudflare_240.pdf',
        'Rename 2026-11-16_StripeFee_118.pdf (+4 more)',
        'Append 6 normalized rows to Q4_Expense_Log.csv',
      ],
      riskLevel: 'medium',
      reversible: true,
      rollbackHint: 'Moves all 6 PDFs back to Inbox with original filenames and truncates appended CSV rows.',
    },
  },
  {
    id: 'pb-proposal-sync',
    title: 'Client Proposal Follow-Up',
    department: 'Sales',
    scheduleHint: 'Daily · 16:00',
    estimatedMinutesSaved: 28,
    requiredTier: 'approve-first',
    targetFolderId: 'fld-proposals',
    summary: 'Identify proposals untouched for 72+ hours and draft tailored follow-up memos ready for approval.',
    steps: [
      'Audit modification timestamps in C:\\Work\\Proposals',
      'Match stalled decks with active Client CRM memory notes',
      'Generate 2 personalized follow-up drafts for owner review',
    ],
    stagedAction: {
      title: 'Stage 2 client follow-up drafts (NordicTech & Apex)',
      targetPath: 'C:\\Work\\Proposals\\Drafts\\FollowUps',
      affectedItems: [
        'NordicTech_Renewal_FollowUp.txt (Q4 scope pricing)',
        'Apex_Logistics_Kickoff_Memo.txt (3-PC rollout plan)',
      ],
      riskLevel: 'medium',
      reversible: true,
      rollbackHint: 'Deletes staged draft text files without sending external messages.',
    },
  },
  {
    id: 'pb-desktop-hygiene',
    title: 'Evening Workspace Hygiene',
    department: 'Workstation',
    scheduleHint: 'Daily · 18:30',
    estimatedMinutesSaved: 15,
    requiredTier: 'auto-pilot',
    targetFolderId: 'fld-desktop',
    summary: 'Archive loose desktop screenshots, installers, and temporary exports into dated archive folders.',
    steps: [
      'Identify screenshots and exports older than 24h on Desktop',
      'Skip pinned active project shortcuts and open documents',
      'Move 11 loose files into Desktop\\Archive\\2026-11',
    ],
    stagedAction: {
      title: 'Archive 11 loose desktop files to Archive\\2026-11',
      targetPath: 'C:\\Users\\Owner\\Desktop\\Archive\\2026-11',
      affectedItems: [
        'Move 7 PNG screen captures & 4 CSV exports',
        'Preserve 5 pinned desktop project shortcuts untouched',
      ],
      riskLevel: 'low',
      reversible: true,
      rollbackHint: 'Restores all 11 archived items back to C:\\Users\\Owner\\Desktop.',
    },
  },
];

export const INITIAL_ACTION_LEDGER: ActionLedgerEntry[] = [
  {
    id: 'act-seed-pending',
    timestamp: '09:12:04',
    playbookId: 'pb-invoice-triage',
    playbookTitle: 'Invoice & Receipt Triage',
    actionTitle: 'Sort 6 vendor receipts into Q4-2026\\Approved',
    targetPath: 'C:\\Business\\Invoices\\Q4-2026\\Approved',
    summary: 'Staged under Approve First tier. Waiting for desktop or Nexora Remote confirmation.',
    affectedItems: [
      'Rename 2026-11-15_Cloudflare_240.pdf',
      'Rename 2026-11-16_StripeFee_118.pdf (+4 more)',
      'Append 6 normalized rows to Q4_Expense_Log.csv',
    ],
    autonomyTier: 'approve-first',
    status: 'Pending Approval',
    reversible: true,
    rollbackHint: 'Moves all 6 PDFs back to Inbox with original filenames and truncates appended CSV rows.',
  },
  {
    id: 'act-seed-exec',
    timestamp: '09:00:11',
    playbookId: 'pb-morning-brief',
    playbookTitle: '09:00 Executive Desk Brief',
    actionTitle: 'Publish Morning_Brief_Today.md (4 priority items)',
    targetPath: 'C:\\Business\\Reports\\Morning_Brief_Today.md',
    summary: 'Compiled KPI digest across Finance & Ops workstations and synced summary to Core.',
    affectedItems: [
      'Digest 3 overnight revenue CSVs (+14.2% WoW)',
      'Flag 2 overdue client retainers ($4,800 total)',
    ],
    autonomyTier: 'auto-pilot',
    status: 'Executed',
    reversible: true,
    rollbackHint: 'Removes generated brief file and restores previous digest index.',
  },
];

export const RELEASE_INFO = {
  version: '3.1.21',
  generation: 'Generation 3',
  size: '368 MB',
  platform: 'Windows 10 / 11 (x64)',
  releasedAt: '2026-11-10',
  sha256: '8f4c91e2b7a0d54f8392c1e6b4a7f09d2c5e8a1b3d6f709c4a2e1b8d5f3c902a',
  changelog: [
    'Introduced Reactive Core Moods (Standby, Focus, Briefing, Night) synchronized with 3D shaders',
    'Added Scoped Folder Allowlists, Autonomy Tiers, Emergency Kill Switch, and Action Ledger Undo',
    'Accelerated Nexora Remote NXR-XXXX-RMT pairing handshake latency with Mobile Executive Approvals',
    'Hardened local-first microphone gating, SHA-256 verification scripts, and Urdu/Hindi cadence',
  ],
};
