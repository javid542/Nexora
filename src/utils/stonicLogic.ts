import type {
  AvatarForm,
  CloudPlanId,
  DeviceSlot,
  FaqItem,
  HeadlineItem,
  MemoryItem,
  MemoryVaultFilter,
  PersonaPreset,
  VoicePersonalityProfile,
} from '../data/stonicData.ts';

export const MAX_DEVICES = 3;
export const MAX_DEVICE_NAME_LENGTH = 40;
export const MAX_MEMORY_LENGTH = 280;
export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;

export interface CloudUsageSummary {
  planLabel: string;
  dailyLimit: number;
  dailyUsed: number;
  dailyRemaining: number;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  percentUsed: number;
  unlimitedByok: boolean;
}

export function isValidEntityId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && VALID_ID_REGEX.test(id);
}

export function generateSafeEntityId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'item';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${cleanPrefix}-${Date.now()}-${rand}`;
}

export function sanitizeMemoryInput(
  rawText: string
): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: 'Memory note cannot be empty.' };
  }
  const bounded = trimmed.slice(0, MAX_MEMORY_LENGTH);
  return { ok: true, text: bounded };
}

export function buildPurchaseSummary(plan: 'lifetime' | 'basic' | 'power'): {
  item: string;
  amount: string;
  cloudPlanAfter: CloudPlanId;
} {
  if (plan === 'lifetime') {
    return {
      item: 'NexoraAI · Lifetime Gen 3',
      amount: '$56',
      cloudPlanAfter: 'free-trial',
    };
  }
  if (plan === 'basic') {
    return {
      item: 'Nexora Cloud · Basic',
      amount: '$19/mo',
      cloudPlanAfter: 'basic',
    };
  }
  return {
    item: 'Nexora Cloud · Power',
    amount: '$49/mo',
    cloudPlanAfter: 'power',
  };
}

export function canActivateDevice(devices: DeviceSlot[], maxDevices = MAX_DEVICES): boolean {
  return devices.length < maxDevices;
}

export function registerDevice(
  devices: DeviceSlot[],
  deviceName: string,
  os: string,
  maxDevices = MAX_DEVICES
): { ok: true; devices: DeviceSlot[] } | { ok: false; error: string } {
  const trimmed = deviceName.trim();
  if (!trimmed) {
    return { ok: false, error: 'Device name is required.' };
  }
  if (trimmed.length > MAX_DEVICE_NAME_LENGTH) {
    return {
      ok: false,
      error: `Device name must be ${MAX_DEVICE_NAME_LENGTH} characters or fewer.`,
    };
  }
  if (!canActivateDevice(devices, maxDevices)) {
    return {
      ok: false,
      error: `Maximum of ${maxDevices} active devices reached. Revoke an existing device first.`,
    };
  }
  const duplicate = devices.some(
    (d) => d.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'A device with that name is already registered.' };
  }
  const next: DeviceSlot = {
    id: generateSafeEntityId('dev'),
    name: trimmed,
    os: os === 'Windows 10 x64' ? 'Windows 10 x64' : 'Windows 11 x64',
    lastActive: 'Just now',
    status: 'Active',
  };
  return { ok: true, devices: [...devices, next] };
}

export function revokeDevice(devices: DeviceSlot[], deviceId: string): DeviceSlot[] {
  return devices.filter((d) => d.id !== deviceId);
}

export function calculateCloudUsage(
  plan: CloudPlanId,
  dailyUsed: number,
  monthlyUsed: number
): CloudUsageSummary {
  if (plan === 'byok') {
    return {
      planLabel: 'Own API Key (BYOK)',
      dailyLimit: 0,
      dailyUsed: 0,
      dailyRemaining: 0,
      monthlyLimit: 0,
      monthlyUsed: 0,
      monthlyRemaining: 0,
      percentUsed: 0,
      unlimitedByok: true,
    };
  }

  const limits: Record<Exclude<CloudPlanId, 'byok'>, { label: string; daily: number; monthly: number }> = {
    'free-trial': { label: 'Nexora Cloud · First Month Free', daily: 120, monthly: 2400 },
    basic: { label: 'Nexora Cloud · Basic ($19/mo)', daily: 150, monthly: 3000 },
    power: { label: 'Nexora Cloud · Power ($49/mo)', daily: 525, monthly: 10500 },
  };

  const config = limits[plan];
  const clampedDaily = Math.max(0, Math.min(dailyUsed, config.daily));
  const clampedMonthly = Math.max(0, Math.min(monthlyUsed, config.monthly));
  const percentUsed = Math.round((clampedMonthly / config.monthly) * 100);

  return {
    planLabel: config.label,
    dailyLimit: config.daily,
    dailyUsed: clampedDaily,
    dailyRemaining: Math.max(0, config.daily - clampedDaily),
    monthlyLimit: config.monthly,
    monthlyUsed: clampedMonthly,
    monthlyRemaining: Math.max(0, config.monthly - clampedMonthly),
    percentUsed,
    unlimitedByok: false,
  };
}

export function filterMemoriesByVault(
  memories: MemoryItem[],
  vaultFilter: MemoryVaultFilter
): MemoryItem[] {
  return memories.filter((m) => vaultFilter[m.category] !== false);
}

export function buildCharacterSystemPrompt(
  persona: PersonaPreset,
  avatarForm: AvatarForm,
  memories: MemoryItem[],
  customTone?: string,
  voiceProfile?: VoicePersonalityProfile
): string {
  const formLabel =
    avatarForm === 'core'
      ? 'an abstract luminous Core orb'
      : avatarForm === 'female'
        ? 'a Female holographic particle figure'
        : 'a Male holographic particle figure';

  const memoryBlock =
    memories.length > 0
      ? `Active user memories to remember naturally:\n${memories
          .map((m) => `- [${m.category}] ${m.text}`)
          .join('\n')}`
      : 'No saved user memories yet.';

  const customBlock =
    persona.id === 'custom' && customTone?.trim()
      ? `\nCustom user personality instruction: ${customTone.trim()}`
      : '';

  const styleDirective = voiceProfile
    ? `Response calibration: Warmth=${Math.round(voiceProfile.warmth)}/100 (${
        voiceProfile.warmth >= 70
          ? 'warm, attentive, reassuring'
          : voiceProfile.warmth <= 35
            ? 'cool, tactical, matter-of-fact'
            : 'balanced, calm, conversational'
      }); Conciseness=${Math.round(voiceProfile.conciseness)}/100 (${
        voiceProfile.conciseness >= 70
          ? 'tight 1-2 sentence spoken turns'
          : voiceProfile.conciseness <= 35
            ? 'thoughtful 4-6 sentence explanations'
            : 'concise 2-4 sentences'
      }).`
    : 'Keep responses concise (2-4 sentences), natural for spoken voice, and grounded in your persona.';

  return [
    persona.systemPrompt,
    `Current visual avatar form on screen: ${formLabel}.`,
    memoryBlock,
    customBlock,
    styleDirective,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number
): { x: number; y: number; z: number } {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function filterFaqItems(
  items: FaqItem[],
  category: FaqItem['category'] | 'All',
  query: string
): FaqItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCat = category === 'All' || item.category === category;
    if (!matchesCat) return false;
    if (!q) return true;
    return (
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q)
    );
  });
}

export function filterHeadlines(
  headlines: HeadlineItem[],
  region: HeadlineItem['region'] | 'All'
): HeadlineItem[] {
  if (region === 'All') return headlines;
  return headlines.filter((h) => h.region === region);
}

export const PAIRING_CODE_REGEX = /^(?:NXR|STN)-\d{4}-RMT$/;

export function normalizePairingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidPairingCode(raw: string): boolean {
  const normalized = normalizePairingCode(raw);
  return PAIRING_CODE_REGEX.test(normalized);
}

export function formatCallDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function buildBootstrapperScript(params: {
  version: string;
  sha256: string;
  appUrl: string;
}): string {
  const safeVersion = params.version.replace(/[^0-9A-Za-z._-]/g, '');
  const safeHash = params.sha256.replace(/[^a-fA-F0-9]/g, '').toLowerCase();
  const safeUrl = params.appUrl.replace(/[`"$]/g, '');
  return [
    `# NexoraAI.com Generation 3 · Windows Setup & Verification Script`,
    `# Release: v${safeVersion} (Windows 10 / 11 x64)`,
    `# Expected SHA-256: ${safeHash}`,
    ``,
    `$ErrorActionPreference = 'Stop'`,
    `$InstallerName = "NexoraAI-Setup-${safeVersion}.exe"`,
    `$TargetPath = Join-Path $env:USERPROFILE "Downloads\\$InstallerName"`,
    `$PortalUrl = "${safeUrl}"`,
    ``,
    `Write-Host "NexoraAI Generation 3 · Setup Verification (v${safeVersion})" -ForegroundColor Cyan`,
    `if (Test-Path $TargetPath) {`,
    `  $ActualHash = (Get-FileHash -Path $TargetPath -Algorithm SHA256).Hash.ToLower()`,
    `  if ($ActualHash -eq "${safeHash}") {`,
    `    Write-Host "Checksum verified: $ActualHash" -ForegroundColor Green`,
    `    Start-Process -FilePath $TargetPath`,
    `  } else {`,
    `    Write-Warning "Checksum mismatch for $InstallerName. Expected ${safeHash}, found $ActualHash."`,
    `    exit 1`,
    `  }`,
    `} else {`,
    `  Write-Host "Installer not found at $TargetPath." -ForegroundColor Yellow`,
    `  Write-Host "Sign in at $PortalUrl/account after installation to bind up to 3 Windows PCs."`,
    `}`,
    ``,
  ].join('\n');
}

export interface CostComparisonInput {
  dailyTurns: number;
  months: number;
  depth: 'concise' | 'balanced' | 'deep';
}

export interface CostComparisonResult {
  monthlyTurns: number;
  recommendedCloudTier: 'basic' | 'power';
  cloudMonthlyPrice: number;
  byokMonthlyApiEstimate: number;
  cloudTotalCost: number;
  byokTotalCost: number;
  savingsWithByok: number;
  verdict: string;
}

export function calculateCostComparison(input: CostComparisonInput): CostComparisonResult {
  const safeTurns = Math.max(5, Math.min(600, Math.round(input.dailyTurns)));
  const safeMonths = Math.max(1, Math.min(36, Math.round(input.months)));
  const monthlyTurns = safeTurns * 30;

  // Basic covers up to 3,000 monthly turns (~100/day); Power covers up to 10,500 monthly turns
  const recommendedCloudTier: 'basic' | 'power' = monthlyTurns <= 3000 ? 'basic' : 'power';
  const cloudMonthlyPrice = recommendedCloudTier === 'basic' ? 19 : 49;

  // First month of Nexora Cloud is included free with $56 Lifetime license
  const paidCloudMonths = Math.max(0, safeMonths - 1);
  const cloudTotalCost = 56 + paidCloudMonths * cloudMonthlyPrice;

  // Approximate direct provider token cost per turn by response depth
  const costPerTurnUsd =
    input.depth === 'concise' ? 0.0005 : input.depth === 'balanced' ? 0.0012 : 0.0032;
  const byokMonthlyApiEstimate = Number((monthlyTurns * costPerTurnUsd).toFixed(2));
  const byokTotalCost = Number((56 + safeMonths * byokMonthlyApiEstimate).toFixed(2));
  const savingsWithByok = Number((cloudTotalCost - byokTotalCost).toFixed(2));

  const verdict =
    safeMonths === 1
      ? 'Month 1 is $0 on Nexora Cloud — included free with Lifetime.'
      : savingsWithByok > 25
        ? `BYOK saves ~$${Math.round(savingsWithByok)} over ${safeMonths} months while keeping full API control.`
        : 'Nexora Cloud keeps billing unified with zero API key setup at competitive volume cost.';

  return {
    monthlyTurns,
    recommendedCloudTier,
    cloudMonthlyPrice,
    byokMonthlyApiEstimate,
    cloudTotalCost,
    byokTotalCost,
    savingsWithByok,
    verdict,
  };
}

export interface CommandItem {
  id: string;
  label: string;
  section: 'Mood' | 'Form' | 'Focus' | 'Navigate' | 'Prompt';
  keywords: string;
  shortcut?: string;
}

export function filterCommandActions(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.section.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
  );
}

export const ADMIN_OWNER_EMAIL = 'javidtaran88@gmail.com';
export const MIN_RECEIPT_REF_LENGTH = 4;
export const MAX_RECEIPT_REF_LENGTH = 80;

export function isAdminEmail(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().toLowerCase() === ADMIN_OWNER_EMAIL;
}

export function requiresManualVerification(method: string): boolean {
  return method !== 'Card';
}

export function sanitizeReceiptReference(
  rawRef: string
): { ok: true; referenceCode: string } | { ok: false; error: string } {
  const cleaned = rawRef.trim().replace(/\s+/g, ' ');
  if (cleaned.length < MIN_RECEIPT_REF_LENGTH) {
    return {
      ok: false,
      error: `Enter a valid transaction reference (at least ${MIN_RECEIPT_REF_LENGTH} characters).`,
    };
  }
  return {
    ok: true,
    referenceCode: cleaned.slice(0, MAX_RECEIPT_REF_LENGTH),
  };
}

