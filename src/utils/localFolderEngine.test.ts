import test from 'node:test';
import assert from 'node:assert/strict';
import { BUSINESS_PLAYBOOKS } from '../data/stonicData';
import {
  buildRealFolderPlan,
  extractFileExtension,
  formatBytesCompact,
  isHygieneClutterCandidate,
  isInvoiceCandidate,
  isProposalCandidate,
  ScannedLocalFile,
  shouldAutoExecuteRealPlan,
} from './localFolderEngine';

const SAMPLE_FILES: ScannedLocalFile[] = [
  { name: 'Invoice-Acme-Nov.pdf', kind: 'file', sizeBytes: 42000, lastModifiedMs: 1700002000000, extension: '.pdf' },
  { name: 'Proposal-Nordic-Q4.txt', kind: 'file', sizeBytes: 1850, lastModifiedMs: 1700003000000, extension: '.txt' },
  { name: 'build-debug.tmp', kind: 'file', sizeBytes: 512, lastModifiedMs: 1700001000000, extension: '.tmp' },
  { name: '_Nexora-Executive-Brief-2026-11-16.md', kind: 'file', sizeBytes: 900, lastModifiedMs: 1700000000000, extension: '.md' },
];

test('localFolderEngine classifies invoice, proposal, and clutter candidates accurately', () => {
  assert.equal(extractFileExtension('Report.Final.PDF'), '.pdf');
  assert.equal(extractFileExtension('README'), '');
  assert.equal(formatBytesCompact(512), '512 B');
  assert.equal(formatBytesCompact(2048), '2.0 KB');

  assert.equal(isInvoiceCandidate(SAMPLE_FILES[0]), true);
  assert.equal(isInvoiceCandidate(SAMPLE_FILES[2]), false);
  assert.equal(isProposalCandidate(SAMPLE_FILES[1]), true);
  assert.equal(isProposalCandidate(SAMPLE_FILES[3]), false);
  assert.equal(isHygieneClutterCandidate(SAMPLE_FILES[2]), true);
  assert.equal(isHygieneClutterCandidate(SAMPLE_FILES[0]), false);
});

test('buildRealFolderPlan creates reversible operations for each playbook and enforces auto-pilot risk gates', () => {
  const briefPb = BUSINESS_PLAYBOOKS.find((p) => p.id === 'pb-morning-brief')!;
  const invoicePb = BUSINESS_PLAYBOOKS.find((p) => p.id === 'pb-invoice-triage')!;
  const proposalPb = BUSINESS_PLAYBOOKS.find((p) => p.id === 'pb-proposal-sync')!;
  const hygienePb = BUSINESS_PLAYBOOKS.find((p) => p.id === 'pb-desktop-hygiene')!;

  const proposalPlan = buildRealFolderPlan({
    playbook: proposalPb,
    folderName: 'Nexora-Test',
    files: SAMPLE_FILES,
    dateStamp: '2026-11-17',
  });
  assert.equal(proposalPlan.riskLevel, 'low');
  if (proposalPlan.operations[0]?.type === 'write_new') {
    assert.match(proposalPlan.operations[0].content, /Proposal-Nordic-Q4\.txt/);
  }

  const briefPlan = buildRealFolderPlan({
    playbook: briefPb,
    folderName: 'Nexora-Test',
    files: SAMPLE_FILES,
    dateStamp: '2026-11-17',
    snippetPreviews: { 'Proposal-Nordic-Q4.txt': 'Scope covers Q4 rollout.' },
  });
  assert.equal(briefPlan.riskLevel, 'low');
  assert.equal(briefPlan.operations.length, 1);
  assert.equal(briefPlan.operations[0].type, 'write_new');
  if (briefPlan.operations[0].type === 'write_new') {
    assert.equal(briefPlan.operations[0].relativePath, '_Nexora-Executive-Brief-2026-11-17.md');
    assert.match(briefPlan.operations[0].content, /Scope covers Q4 rollout/);
  }
  assert.equal(shouldAutoExecuteRealPlan('auto-pilot', briefPlan), true);
  assert.equal(shouldAutoExecuteRealPlan('approve-first', briefPlan), false);

  const invoicePlan = buildRealFolderPlan({
    playbook: invoicePb,
    folderName: 'Nexora-Test',
    files: SAMPLE_FILES,
    dateStamp: '2026-11-17',
  });
  assert.equal(invoicePlan.riskLevel, 'medium');
  assert.equal(invoicePlan.operations.some((op) => op.type === 'move_to_subfolder' && op.sourceName === 'Invoice-Acme-Nov.pdf'), true);
  assert.equal(shouldAutoExecuteRealPlan('auto-pilot', invoicePlan), false);

  const hygienePlan = buildRealFolderPlan({
    playbook: hygienePb,
    folderName: 'Nexora-Test',
    files: SAMPLE_FILES,
    dateStamp: '2026-11-17',
  });
  assert.equal(hygienePlan.operations.some((op) => op.type === 'move_to_subfolder' && op.sourceName === 'build-debug.tmp'), true);
});
