import type { AutonomyTier, BusinessPlaybook } from '../data/stonicData';

export interface ScannedLocalFile {
  name: string;
  kind: 'file' | 'directory';
  sizeBytes: number;
  lastModifiedMs: number;
  extension: string;
}

export type PlannedFileOp =
  | {
      type: 'write_new';
      relativePath: string;
      content: string;
      description: string;
    }
  | {
      type: 'move_to_subfolder';
      sourceName: string;
      targetSubfolder: string;
      targetName: string;
      description: string;
    };

export interface RealFolderPlan {
  actionTitle: string;
  targetPath: string;
  affectedItems: string[];
  rollbackHint: string;
  operations: PlannedFileOp[];
  riskLevel: 'low' | 'medium';
}

export function extractFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.');
  if (idx <= 0 || idx === fileName.length - 1) return '';
  return fileName.slice(idx).toLowerCase();
}

export function formatBytesCompact(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isProtectedNexoraOutput(name: string): boolean {
  return name.startsWith('_Nexora') || name.startsWith('_Proposal') || name.startsWith('_Workspace') || name.startsWith('_Invoice-Index');
}

export function isInvoiceCandidate(file: ScannedLocalFile): boolean {
  if (file.kind !== 'file' || isProtectedNexoraOutput(file.name)) return false;
  const lower = file.name.toLowerCase();
  const keywordMatch = /(invoice|receipt|bill|tax|ledger|statement|remittance)/.test(lower);
  const extMatch = ['.pdf', '.csv', '.xlsx', '.xls'].includes(file.extension);
  return keywordMatch || extMatch;
}

export function isProposalCandidate(file: ScannedLocalFile): boolean {
  if (file.kind !== 'file' || isProtectedNexoraOutput(file.name)) return false;
  const lower = file.name.toLowerCase();
  return /(proposal|quote|estimate|contract|client|pitch|scope)/.test(lower) || ['.docx', '.md', '.txt'].includes(file.extension);
}

export function isHygieneClutterCandidate(file: ScannedLocalFile): boolean {
  if (file.kind !== 'file' || isProtectedNexoraOutput(file.name)) return false;
  const lower = file.name.toLowerCase();
  if (['.tmp', '.log', '.bak'].includes(file.extension)) return true;
  return /(screenshot|untitled|copy|draft-old)/.test(lower);
}

export function buildRealFolderPlan(params: {
  playbook: BusinessPlaybook;
  folderName: string;
  files: ScannedLocalFile[];
  dateStamp?: string;
  snippetPreviews?: Record<string, string>;
}): RealFolderPlan {
  const { playbook, folderName, files } = params;
  const dateStamp = params.dateStamp || new Date().toISOString().slice(0, 10);
  const rootFiles = files.filter((f) => f.kind === 'file');
  const rootDirs = files.filter((f) => f.kind === 'directory');

  if (playbook.id === 'pb-morning-brief') {
    const outFile = `_Nexora-Executive-Brief-${dateStamp}.md`;
    const recentSorted = [...rootFiles].sort((a, b) => b.lastModifiedMs - a.lastModifiedMs).slice(0, 8);
    const totalBytes = rootFiles.reduce((acc, f) => acc + f.sizeBytes, 0);
    const lines = [
      `# NexoraAI Executive Desk Brief (${dateStamp})`,
      ``,
      `- **Connected Folder:** ${folderName}`,
      `- **Files Scanned:** ${rootFiles.length} files, ${rootDirs.length} subfolders (${formatBytesCompact(totalBytes)})`,
      ``,
      `## Recent Documents`,
      ...(recentSorted.length > 0
        ? recentSorted.map((f) => {
            const snippet = params.snippetPreviews?.[f.name]?.trim();
            return `- \`${f.name}\` (${formatBytesCompact(f.sizeBytes)})${snippet ? ` — "${snippet.slice(0, 90)}"` : ''}`;
          })
        : [`- Folder is currently empty. Add files or click "Seed 3 Sample Business Files" to test triage.`]),
      ``,
      `## Recommended Next Action`,
      `- Run Invoice & Receipt Triage if accounting files are present, or keep Read & Draft active for manual review.`,
      ``,
    ];
    return {
      actionTitle: `Write Executive Brief inside "${folderName}"`,
      targetPath: `${folderName}/${outFile}`,
      affectedItems: [
        `Scanned ${rootFiles.length} files across connected folder "${folderName}"`,
        `Create Markdown brief: ${outFile}`,
      ],
      rollbackHint: `Undo deletes ${outFile} (or restores its previous version if overwritten).`,
      operations: [
        {
          type: 'write_new',
          relativePath: outFile,
          content: lines.join('\n'),
          description: `Create ${outFile}`,
        },
      ],
      riskLevel: 'low',
    };
  }

  if (playbook.id === 'pb-invoice-triage') {
    const candidates = rootFiles.filter(isInvoiceCandidate).slice(0, 15);
    const subfolder = 'Invoices-Sorted';
    const indexFile = `_Invoice-Index-${dateStamp}.csv`;
    const csvRows = [
      'Filename,Extension,SizeBytes,Destination',
      ...(candidates.length > 0
        ? candidates.map((f) => `"${f.name.replace(/"/g, '""')}","${f.extension || 'file'}",${f.sizeBytes},"${subfolder}/${f.name.replace(/"/g, '""')}"`)
        : [`"No root invoice files detected","",0,"${folderName}"`]),
    ];

    const ops: PlannedFileOp[] = [
      {
        type: 'write_new',
        relativePath: indexFile,
        content: csvRows.join('\n') + '\n',
        description: `Generate CSV index ${indexFile}`,
      },
      ...candidates.map(
        (f): PlannedFileOp => ({
          type: 'move_to_subfolder',
          sourceName: f.name,
          targetSubfolder: subfolder,
          targetName: f.name,
          description: `Move ${f.name} -> ${subfolder}/${f.name}`,
        })
      ),
    ];

    return {
      actionTitle:
        candidates.length > 0
          ? `Sort ${candidates.length} invoice file(s) & write CSV index`
          : `Create invoice triage index in "${folderName}"`,
      targetPath: `${folderName}/${subfolder}`,
      affectedItems:
        candidates.length > 0
          ? [
              ...candidates.slice(0, 4).map((f) => `Move ${f.name} -> ${subfolder}/${f.name}`),
              ...(candidates.length > 4 ? [`+ ${candidates.length - 4} more file(s)`] : []),
              `Write manifest CSV: ${indexFile}`,
            ]
          : [
              `No invoice filenames/PDFs found in root of "${folderName}"`,
              `Write empty-scan audit log: ${indexFile}`,
            ],
      rollbackHint: `Undo restores all moved files back to "${folderName}" root and removes ${indexFile}.`,
      operations: ops,
      riskLevel: candidates.length > 0 ? 'medium' : 'low',
    };
  }

  if (playbook.id === 'pb-proposal-sync') {
    const candidates = rootFiles.filter(isProposalCandidate).slice(0, 10);
    const outFile = `_Proposal-FollowUp-Drafts-${dateStamp}.md`;
    const lines = [
      `# Proposal Follow-Up Drafts (${dateStamp})`,
      ``,
      `Folder: ${folderName} (Drafts only — zero external messages sent)`,
      ``,
      ...(candidates.length > 0
        ? candidates.flatMap((f) => [
            `## Follow-up for \`${f.name}\``,
            `- **Subject:** Checking in on ${f.name.replace(/\.[^.]+$/, '')}`,
            `- **Draft:** Hi there, following up on ${f.name}. Let me know if you have any questions on scope or timeline this week.`,
            ``,
          ])
        : [
            `## No proposal files detected yet`,
            `- Add a .txt, .md, or proposal document to "${folderName}" and re-run to generate tailored follow-up drafts.`,
            ``,
          ]),
    ];

    return {
      actionTitle: `Draft follow-ups for ${candidates.length} document(s)`,
      targetPath: `${folderName}/${outFile}`,
      affectedItems:
        candidates.length > 0
          ? [
              ...candidates.slice(0, 3).map((f) => `Stage email draft referencing ${f.name}`),
              `Save Markdown review file: ${outFile}`,
            ]
          : [`Save Markdown template: ${outFile}`],
      rollbackHint: `Undo deletes ${outFile} cleanly without touching existing documents.`,
      operations: [
        {
          type: 'write_new',
          relativePath: outFile,
          content: lines.join('\n'),
          description: `Create ${outFile}`,
        },
      ],
      riskLevel: 'low',
    };
  }

  // pb-evening-hygiene
  const clutter = rootFiles.filter(isHygieneClutterCandidate).slice(0, 15);
  const archiveFolder = `Archive-Hygiene-${dateStamp}`;
  const digestFile = `_Workspace-Digest-${dateStamp}.md`;
  const digestLines = [
    `# Evening Workspace Hygiene Digest (${dateStamp})`,
    ``,
    `- **Folder:** ${folderName}`,
    `- **Root Files Checked:** ${rootFiles.length}`,
    `- **Temp / Draft Clutter Archived:** ${clutter.length}`,
    ``,
    ...(clutter.length > 0
      ? [`## Moved to ${archiveFolder}`, ...clutter.map((f) => `- ${f.name} (${formatBytesCompact(f.sizeBytes)})`)]
      : [`## Clean Workspace`, `- Zero .tmp/.log/.bak or screenshot clutter found in "${folderName}".`]),
    ``,
  ];

  const ops: PlannedFileOp[] = [
    {
      type: 'write_new',
      relativePath: digestFile,
      content: digestLines.join('\n'),
      description: `Write ${digestFile}`,
    },
    ...clutter.map(
      (f): PlannedFileOp => ({
        type: 'move_to_subfolder',
        sourceName: f.name,
        targetSubfolder: archiveFolder,
        targetName: f.name,
        description: `Archive ${f.name} -> ${archiveFolder}/${f.name}`,
      })
    ),
  ];

  return {
    actionTitle:
      clutter.length > 0
        ? `Archive ${clutter.length} temp/draft file(s) & write digest`
        : `Write clean workspace hygiene digest in "${folderName}"`,
    targetPath: `${folderName}/${clutter.length > 0 ? archiveFolder : digestFile}`,
    affectedItems:
      clutter.length > 0
        ? [
            ...clutter.slice(0, 4).map((f) => `Archive ${f.name} -> ${archiveFolder}/${f.name}`),
            `Write digest: ${digestFile}`,
          ]
        : [`Folder clean (${rootFiles.length} file(s))`, `Write digest: ${digestFile}`],
    rollbackHint: `Undo restores any archived files back to root and removes ${digestFile}.`,
    operations: ops,
    riskLevel: clutter.length > 0 ? 'medium' : 'low',
  };
}

export function shouldAutoExecuteRealPlan(tier: AutonomyTier, plan: RealFolderPlan): boolean {
  return tier === 'auto-pilot' && plan.riskLevel === 'low';
}
