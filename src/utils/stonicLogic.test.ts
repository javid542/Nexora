import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBootstrapperScript,
  buildCharacterSystemPrompt,
  buildPurchaseSummary,
  calculateCloudUsage,
  calculateCostComparison,
  canActivateDevice,
  filterCommandActions,
  filterFaqItems,
  filterHeadlines,
  filterMemoriesByVault,
  formatCallDuration,
  generateSafeEntityId,
  isAdminEmail,
  isValidEntityId,
  isValidPairingCode,
  latLonToVector3,
  MAX_MEMORY_LENGTH,
  normalizePairingCode,
  registerDevice,
  requiresManualVerification,
  revokeDevice,
  sanitizeMemoryInput,
  sanitizeReceiptReference,
} from './stonicLogic';
import { FAQ_ITEMS, HEADLINES, PERSONAS } from '../data/stonicData';

test('device registration enforces 3-device limit and non-empty unique names', () => {
  const initial = [
    { id: 'd1', name: 'Desk-PC', os: 'Windows 11 x64', lastActive: 'Today', status: 'Active' as const },
    { id: 'd2', name: 'Studio-Rig', os: 'Windows 11 x64', lastActive: 'Today', status: 'Standby' as const },
  ];

  const emptyRes = registerDevice(initial, '   ', 'Windows 11 x64');
  assert.equal(emptyRes.ok, false);

  const dupRes = registerDevice(initial, 'desk-pc', 'Windows 11 x64');
  assert.equal(dupRes.ok, false);

  const third = registerDevice(initial, 'Travel-Laptop', 'Windows 10 x64');
  assert.equal(third.ok, true);
  if (third.ok) {
    assert.equal(third.devices.length, 3);
    assert.equal(canActivateDevice(third.devices), false);

    const fourth = registerDevice(third.devices, 'Extra-PC', 'Windows 11 x64');
    assert.equal(fourth.ok, false);

    const revoked = revokeDevice(third.devices, 'd2');
    assert.equal(revoked.length, 2);
    assert.equal(canActivateDevice(revoked), true);
  }
});

test('calculateCloudUsage handles Power 3.5x scale and BYOK mode', () => {
  const basic = calculateCloudUsage('basic', 30, 300);
  const power = calculateCloudUsage('power', 30, 300);
  assert.equal(power.monthlyLimit / basic.monthlyLimit, 3.5);
  assert.equal(power.dailyLimit / basic.dailyLimit, 3.5);

  const byok = calculateCloudUsage('byok', 999, 9999);
  assert.equal(byok.unlimitedByok, true);
  assert.equal(byok.dailyLimit, 0);
});

test('latLonToVector3 projects coordinates onto sphere radius cleanly', () => {
  const v = latLonToVector3(37.7749, -122.4194, 2);
  const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  assert.ok(Math.abs(mag - 2) < 1e-6);
});

test('buildCharacterSystemPrompt includes persona, avatar form, memories, and voice calibration', () => {
  const prompt = buildCharacterSystemPrompt(
    PERSONAS[0],
    'male',
    [{ id: 'm1', text: 'Call me Captain', category: 'identity', createdAt: '2026-11-13' }],
    '',
    { warmth: 85, conciseness: 90, pitch: 1.1, rate: 0.95 }
  );
  assert.match(prompt, /JARVIS/);
  assert.match(prompt, /Male holographic particle figure/);
  assert.match(prompt, /Call me Captain/);
  assert.match(prompt, /Warmth=85\/100/);
  assert.match(prompt, /Conciseness=90\/100/);
});

test('filterFaqItems and filterHeadlines filter accurately', () => {
  const keyFaqs = filterFaqItems(FAQ_ITEMS, 'Lifetime & Cloud', 'BYOK');
  assert.ok(keyFaqs.length >= 1);
  assert.ok(keyFaqs.every((f) => f.category === 'Lifetime & Cloud'));

  const allHeadlines = filterHeadlines(HEADLINES, 'All');
  assert.equal(allHeadlines.length, HEADLINES.length);
  const euHeadlines = filterHeadlines(HEADLINES, 'Europe');
  assert.ok(euHeadlines.every((h) => h.region === 'Europe'));
});

test('blueprint validation helpers enforce ID pattern, memory bounds, and purchase summary', () => {
  const id = generateSafeEntityId('mem');
  assert.equal(isValidEntityId(id), true);
  assert.equal(isValidEntityId('invalid/id!'), false);

  const emptyMem = sanitizeMemoryInput('   ');
  assert.equal(emptyMem.ok, false);

  const longText = 'x'.repeat(MAX_MEMORY_LENGTH + 45);
  const trimmedMem = sanitizeMemoryInput(longText);
  assert.equal(trimmedMem.ok, true);
  if (trimmedMem.ok) {
    assert.equal(trimmedMem.text.length, MAX_MEMORY_LENGTH);
  }

  const lifetime = buildPurchaseSummary('lifetime');
  assert.equal(lifetime.item, 'NexoraAI · Lifetime Gen 3');
  assert.equal(lifetime.amount, '$56');
  assert.equal(lifetime.cloudPlanAfter, 'free-trial');
  assert.equal(buildPurchaseSummary('power').cloudPlanAfter, 'power');
});

test('remote pairing code validation, call timer, and bootstrapper script builder work cleanly', () => {
  assert.equal(normalizePairingCode('  nxr-4201-rmt '), 'NXR-4201-RMT');
  assert.equal(isValidPairingCode('nxr-4201-rmt'), true);
  assert.equal(isValidPairingCode('stn-4201-rmt'), true);
  assert.equal(isValidPairingCode('NXR-12-RMT'), false);
  assert.equal(isValidPairingCode('BAD-CODE'), false);

  assert.equal(formatCallDuration(0), '00:00');
  assert.equal(formatCallDuration(65), '01:05');
  assert.equal(formatCallDuration(-10), '00:00');

  const script = buildBootstrapperScript({
    version: '3.1.21',
    sha256: 'abc123def456',
    appUrl: 'https://nexoraai.com',
  });
  assert.match(script, /NexoraAI-Setup-3\.1\.21\.exe/);
  assert.match(script, /abc123def456/);
  assert.match(script, /https:\/\/nexoraai\.com/);
  assert.match(script, /\$PortalUrl\/account/);
});

test('filterMemoriesByVault filters disabled categories cleanly', () => {
  const sample = [
    { id: '1', text: 'Alex', category: 'identity' as const, createdAt: '2026-11-10' },
    { id: '2', text: 'Obsidian theme', category: 'preference' as const, createdAt: '2026-11-11' },
    { id: '3', text: 'Working on Shader', category: 'context' as const, createdAt: '2026-11-12' },
  ];
  const filtered = filterMemoriesByVault(sample, {
    identity: true,
    preference: false,
    context: true,
  });
  assert.equal(filtered.length, 2);
  assert.equal(filtered.some((m) => m.category === 'preference'), false);
});

test('calculateCostComparison models Basic vs Power tier and BYOK 12-month savings', () => {
  const light12m = calculateCostComparison({ dailyTurns: 40, months: 12, depth: 'balanced' });
  assert.equal(light12m.recommendedCloudTier, 'basic');
  // 56 + 11 * 19 = 265
  assert.equal(light12m.cloudTotalCost, 265);
  assert.ok(light12m.byokTotalCost < light12m.cloudTotalCost);
  assert.ok(light12m.savingsWithByok > 100);

  const heavy6m = calculateCostComparison({ dailyTurns: 180, months: 6, depth: 'deep' });
  assert.equal(heavy6m.recommendedCloudTier, 'power');
  // 56 + 5 * 49 = 301
  assert.equal(heavy6m.cloudTotalCost, 301);

  const month1 = calculateCostComparison({ dailyTurns: 50, months: 1, depth: 'concise' });
  assert.equal(month1.cloudTotalCost, 56);
});

test('filterCommandActions narrows commands by label, section, or keyword', () => {
  const commands = [
    { id: 'mood-focus', label: 'Switch Core to Focus Amber', section: 'Mood' as const, keywords: 'amber calm' },
    { id: 'focus-25', label: 'Start 25m Deep Focus Timer', section: 'Focus' as const, keywords: 'pomodoro sprint' },
    { id: 'nav-pricing', label: 'Open Pricing & Calculator', section: 'Navigate' as const, keywords: 'cost byok' },
  ];
  assert.equal(filterCommandActions(commands, 'pomodoro').length, 1);
  assert.equal(filterCommandActions(commands, 'byok')[0]?.id, 'nav-pricing');
  assert.equal(filterCommandActions(commands, '').length, 3);
});

test('admin authorization and manual payment receipt sanitization enforce bounds', () => {
  assert.equal(isAdminEmail('javidtaran88@gmail.com'), true);
  assert.equal(isAdminEmail(' JavidTaran88@Gmail.com '), true);
  assert.equal(isAdminEmail('buyer@example.com'), false);
  assert.equal(isAdminEmail(null), false);

  assert.equal(requiresManualVerification('Card'), false);
  assert.equal(requiresManualVerification('Bank Transfer'), true);
  assert.equal(requiresManualVerification('JazzCash'), true);
  assert.equal(requiresManualVerification('USDT / Binance Pay'), true);

  const shortRef = sanitizeReceiptReference('  12 ');
  assert.equal(shortRef.ok, false);

  const validRef = sanitizeReceiptReference('  TRX-98421-JC  ');
  assert.equal(validRef.ok, true);
  if (validRef.ok) {
    assert.equal(validRef.referenceCode, 'TRX-98421-JC');
  }
});


