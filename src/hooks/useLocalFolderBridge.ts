import { useState } from 'react';
import {
  extractFileExtension,
  PlannedFileOp,
  RealFolderPlan,
  ScannedLocalFile,
} from '../utils/localFolderEngine';

interface BrowserFileSystemWritableFileStream {
  write: (data: string | BufferSource | Blob) => Promise<void>;
  close: () => Promise<void>;
}

interface BrowserFileSystemFileHandle {
  kind: 'file';
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<BrowserFileSystemWritableFileStream>;
}

interface BrowserFileSystemDirectoryHandle {
  kind: 'directory';
  name: string;
  entries: () => AsyncIterableIterator<[string, BrowserFileSystemFileHandle | BrowserFileSystemDirectoryHandle]>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<BrowserFileSystemFileHandle>;
  getDirectoryHandle: (
    name: string,
    options?: { create?: boolean }
  ) => Promise<BrowserFileSystemDirectoryHandle>;
  removeEntry: (name: string, options?: { recursive?: boolean }) => Promise<void>;
  queryPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission?: (descriptor: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'denied' | 'prompt'>;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string;
      mode?: 'read' | 'readwrite';
      startIn?: 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
    }) => Promise<BrowserFileSystemDirectoryHandle>;
  }
}

type RollbackOp =
  | {
      type: 'restore_or_delete_file';
      relativePath: string;
      existedBefore: boolean;
      previousBytes?: Uint8Array;
    }
  | {
      type: 'restore_moved_file';
      sourceName: string;
      targetSubfolder: string;
      targetName: string;
      originalBytes: Uint8Array;
    };

export interface StagedRealFolderPlan {
  plan: RealFolderPlan;
  status: 'pending' | 'executed' | 'reverted' | 'rejected';
  rollbackOps: RollbackOp[];
}

export function isLocalFolderApiSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
}

async function scanDirectoryHandle(
  handle: BrowserFileSystemDirectoryHandle
): Promise<{ files: ScannedLocalFile[]; snippetPreviews: Record<string, string> }> {
  const scanned: ScannedLocalFile[] = [];
  const snippets: Record<string, string> = {};
  let textReadsRemaining = 5;

  for await (const [entryName, entryHandle] of handle.entries()) {
    if (entryName.startsWith('.')) continue;
    if (scanned.length >= 60) break;

    if (entryHandle.kind === 'file') {
      const fileObj = await entryHandle.getFile();
      const ext = extractFileExtension(entryName);
      scanned.push({
        name: entryName,
        kind: 'file',
        sizeBytes: fileObj.size,
        lastModifiedMs: fileObj.lastModified,
        extension: ext,
      });

      if (
        textReadsRemaining > 0 &&
        ['.txt', '.md', '.csv'].includes(ext) &&
        fileObj.size > 0 &&
        fileObj.size <= 32 * 1024
      ) {
        try {
          const text = await fileObj.text();
          snippets[entryName] = text.replace(/\s+/g, ' ').trim().slice(0, 140);
          textReadsRemaining -= 1;
        } catch {
          // Skip unreadable files gracefully
        }
      }
    } else {
      scanned.push({
        name: entryName,
        kind: 'directory',
        sizeBytes: 0,
        lastModifiedMs: 0,
        extension: '',
      });
    }
  }

  scanned.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { files: scanned, snippetPreviews: snippets };
}

async function ensureReadWritePermission(handle: BrowserFileSystemDirectoryHandle): Promise<boolean> {
  if (handle.queryPermission) {
    const current = await handle.queryPermission({ mode: 'readwrite' });
    if (current === 'granted') return true;
  }
  if (handle.requestPermission) {
    const requested = await handle.requestPermission({ mode: 'readwrite' });
    return requested === 'granted';
  }
  return true;
}

export function useLocalFolderBridge() {
  const [dirHandle, setDirHandle] = useState<BrowserFileSystemDirectoryHandle | null>(null);
  const [folderName, setFolderName] = useState<string>('');
  const [files, setFiles] = useState<ScannedLocalFile[]>([]);
  const [snippetPreviews, setSnippetPreviews] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedAt, setLastScannedAt] = useState<string | null>(null);
  const [realPlansByEntryId, setRealPlansByEntryId] = useState<Record<string, StagedRealFolderPlan>>({});

  const supported = isLocalFolderApiSupported();

  const refreshFolder = async (
    targetHandle: BrowserFileSystemDirectoryHandle | null = dirHandle
  ): Promise<boolean> => {
    if (!targetHandle) return false;
    setBusy(true);
    setErrorMessage(null);
    try {
      const scan = await scanDirectoryHandle(targetHandle);
      setFiles(scan.files);
      setSnippetPreviews(scan.snippetPreviews);
      setLastScannedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      return true;
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to scan the connected Windows folder.'
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const connectFolder = async (): Promise<{ ok: boolean; folderName?: string; message: string }> => {
    if (!window.showDirectoryPicker) {
      const msg =
        'Your current browser does not support File System Access. Open NexoraAI in desktop Google Chrome or Microsoft Edge.';
      setErrorMessage(msg);
      return { ok: false, message: msg };
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const handle = await window.showDirectoryPicker({
        id: 'nexora-business-workspace',
        mode: 'readwrite',
      });
      const granted = await ensureReadWritePermission(handle);
      if (!granted) {
        const deniedMsg = 'Read/write permission was not granted for the selected folder.';
        setErrorMessage(deniedMsg);
        return { ok: false, message: deniedMsg };
      }

      const scan = await scanDirectoryHandle(handle);
      setDirHandle(handle);
      setFolderName(handle.name);
      setFiles(scan.files);
      setSnippetPreviews(scan.snippetPreviews);
      setLastScannedAt(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      return {
        ok: true,
        folderName: handle.name,
        message: `Connected "${handle.name}" (${scan.files.length} item(s) scanned).`,
      };
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { ok: false, message: 'Folder selection cancelled.' };
      }
      const message =
        err instanceof DOMException && err.name === 'SecurityError'
          ? 'Folder picker is blocked inside embedded frames. Open NexoraAI in a full Chrome/Edge tab or installed Desktop PWA window.'
          : err instanceof Error
            ? err.message
            : 'Unable to open folder picker.';
      setErrorMessage(message);
      return { ok: false, message };
    } finally {
      setBusy(false);
    }
  };

  const disconnectFolder = () => {
    setDirHandle(null);
    setFolderName('');
    setFiles([]);
    setSnippetPreviews({});
    setLastScannedAt(null);
    setErrorMessage(null);
  };

  const seedSampleFiles = async (): Promise<{ ok: boolean; message: string }> => {
    if (!dirHandle) {
      return { ok: false, message: 'Connect a local test folder first.' };
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const granted = await ensureReadWritePermission(dirHandle);
      if (!granted) {
        return { ok: false, message: 'Write permission denied on connected folder.' };
      }
      const samples: Array<{ name: string; content: string }> = [
        {
          name: 'Invoice-Acme-Nov.txt',
          content: 'Vendor: Acme Logistics\nInvoice #: INV-2026-114\nAmount Due: $1,240.00\nDue Date: 2026-11-30\n',
        },
        {
          name: 'Proposal-Nordic-Q4.txt',
          content: 'Client: Nordic Supply Co.\nScope: Q4 Operations Rollout across 3 seats.\nFollow-up pending confirmation.\n',
        },
        {
          name: 'session-notes-old.tmp',
          content: 'Temporary scratch export safe to archive during evening workspace hygiene.\n',
        },
      ];

      for (const item of samples) {
        const fileHandle = await dirHandle.getFileHandle(item.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(item.content);
        await writable.close();
      }

      await refreshFolder(dirHandle);
      return {
        ok: true,
        message: `Added 3 sample business test files inside "${dirHandle.name}".`,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create sample files.';
      setErrorMessage(msg);
      return { ok: false, message: msg };
    } finally {
      setBusy(false);
    }
  };

  const executeOperationsOnDisk = async (
    operations: PlannedFileOp[]
  ): Promise<{ ok: true; rollbackOps: RollbackOp[] } | { ok: false; error: string }> => {
    if (!dirHandle) {
      return { ok: false, error: 'Local Windows folder is no longer connected.' };
    }
    const granted = await ensureReadWritePermission(dirHandle);
    if (!granted) {
      return { ok: false, error: 'Read/write permission was revoked by browser.' };
    }

    const rollbackOps: RollbackOp[] = [];
    try {
      for (const op of operations) {
        if (op.type === 'write_new') {
          let existedBefore = false;
          let previousBytes: Uint8Array | undefined;
          try {
            const existingHandle = await dirHandle.getFileHandle(op.relativePath, { create: false });
            const existingFile = await existingHandle.getFile();
            previousBytes = new Uint8Array(await existingFile.arrayBuffer());
            existedBefore = true;
          } catch {
            existedBefore = false;
          }

          const targetHandle = await dirHandle.getFileHandle(op.relativePath, { create: true });
          const writable = await targetHandle.createWritable();
          await writable.write(op.content);
          await writable.close();

          rollbackOps.push({
            type: 'restore_or_delete_file',
            relativePath: op.relativePath,
            existedBefore,
            previousBytes,
          });
        } else {
          const sourceHandle = await dirHandle.getFileHandle(op.sourceName, { create: false });
          const sourceFile = await sourceHandle.getFile();
          const originalBytes = new Uint8Array(await sourceFile.arrayBuffer());

          const subDir = await dirHandle.getDirectoryHandle(op.targetSubfolder, { create: true });
          const destHandle = await subDir.getFileHandle(op.targetName, { create: true });
          const writable = await destHandle.createWritable();
          await writable.write(new Uint8Array(originalBytes));
          await writable.close();

          const writtenCheck = await destHandle.getFile();
          if (writtenCheck.size !== originalBytes.byteLength) {
            throw new Error(`Write size verification failed for "${op.targetName}".`);
          }

          await dirHandle.removeEntry(op.sourceName);
          rollbackOps.push({
            type: 'restore_moved_file',
            sourceName: op.sourceName,
            targetSubfolder: op.targetSubfolder,
            targetName: op.targetName,
            originalBytes,
          });
        }
      }

      await refreshFolder(dirHandle);
      return { ok: true, rollbackOps };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed while writing to connected folder.',
      };
    }
  };

  const registerRealPlan = (
    entryId: string,
    plan: RealFolderPlan,
    initialStatus: 'pending' | 'executed',
    rollbackOps: RollbackOp[] = []
  ) => {
    setRealPlansByEntryId((prev) => ({
      ...prev,
      [entryId]: { plan, status: initialStatus, rollbackOps },
    }));
  };

  const executeRealPlanEntry = async (
    entryId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const record = realPlansByEntryId[entryId];
    if (!record) {
      return {
        ok: false,
        error: 'Session folder handle expired after page reload. Reconnect the local folder and re-run this playbook.',
      };
    }
    const res = await executeOperationsOnDisk(record.plan.operations);
    if (!res.ok) return res;
    setRealPlansByEntryId((prev) => ({
      ...prev,
      [entryId]: { ...record, status: 'executed', rollbackOps: res.rollbackOps },
    }));
    return { ok: true };
  };

  const markRealPlanRejected = (entryId: string) => {
    setRealPlansByEntryId((prev) => {
      const existing = prev[entryId];
      if (!existing) return prev;
      return { ...prev, [entryId]: { ...existing, status: 'rejected' } };
    });
  };

  const revertRealPlanEntry = async (
    entryId: string
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    const record = realPlansByEntryId[entryId];
    if (!record) {
      return {
        ok: false,
        error: 'Rollback snapshot is only retained during the active browser session.',
      };
    }
    if (!dirHandle) {
      return { ok: false, error: 'Reconnect the local folder to execute disk rollback.' };
    }

    const granted = await ensureReadWritePermission(dirHandle);
    if (!granted) {
      return { ok: false, error: 'Write permission required to roll back real files.' };
    }

    try {
      for (const rb of [...record.rollbackOps].reverse()) {
        if (rb.type === 'restore_or_delete_file') {
          if (rb.existedBefore && rb.previousBytes) {
            const handle = await dirHandle.getFileHandle(rb.relativePath, { create: true });
            const writable = await handle.createWritable();
            await writable.write(new Uint8Array(rb.previousBytes));
            await writable.close();
          } else {
            try {
              await dirHandle.removeEntry(rb.relativePath);
            } catch {
              // File already removed manually
            }
          }
        } else {
          const restoredHandle = await dirHandle.getFileHandle(rb.sourceName, { create: true });
          const writable = await restoredHandle.createWritable();
          await writable.write(new Uint8Array(rb.originalBytes));
          await writable.close();

          try {
            const subDir = await dirHandle.getDirectoryHandle(rb.targetSubfolder, { create: false });
            await subDir.removeEntry(rb.targetName);
            let remaining = 0;
            for await (const _ of subDir.entries()) {
              remaining += 1;
              break;
            }
            if (remaining === 0) {
              await dirHandle.removeEntry(rb.targetSubfolder);
            }
          } catch {
            // Subfolder cleanup skipped safely if already moved
          }
        }
      }

      setRealPlansByEntryId((prev) => ({
        ...prev,
        [entryId]: { ...record, status: 'reverted' },
      }));
      await refreshFolder(dirHandle);
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Unable to complete disk rollback.',
      };
    }
  };

  return {
    supported,
    isConnected: Boolean(dirHandle),
    folderName,
    files,
    snippetPreviews,
    busy,
    errorMessage,
    lastScannedAt,
    realPlanEntryIds: Object.keys(realPlansByEntryId),
    connectFolder,
    disconnectFolder,
    refreshFolder,
    seedSampleFiles,
    executeOperationsOnDisk,
    registerRealPlan,
    executeRealPlanEntry,
    markRealPlanRejected,
    revertRealPlanEntry,
  };
}
