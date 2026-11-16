import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { CheckoutModal, CheckoutPlanType } from './components/CheckoutModal';
import { CommandBarModal } from './components/CommandBarModal';
import { Footer } from './components/Footer';
import { AppRoute, Navbar } from './components/Navbar';
import { PreSalesWidget } from './components/PreSalesWidget';
import { ProofModal } from './components/ProofModal';
import { playCoreChime } from './utils/audioChime';
import {
  ActionLedgerEntry,
  AutonomyTier,
  AvatarForm,
  BUSINESS_PLAYBOOKS,
  BusinessPlaybook,
  CloudPlanId,
  CoreMood,
  DEFAULT_FOLDER_PERMISSIONS,
  DEFAULT_MEMORIES,
  DeviceSlot,
  FolderPermission,
  INITIAL_ACTION_LEDGER,
  MemoryItem,
  PaymentSubmissionRecord,
  PurchaseRecord,
  Testimonial,
} from './data/stonicData';
import {
  addDeviceAtomic,
  addMemoryFirestore,
  completePurchaseAtomic,
  deleteMemoryFirestore,
  ensureUserAccount,
  incrementUserUsage,
  reviewPaymentSubmissionAtomic,
  revokeDeviceAtomic,
  setUserAvatarForm,
  setUserCloudPlan,
  signInWithGoogle,
  signOutUser,
  submitPaymentVerification,
  subscribeAllSubmissionsAdmin,
  subscribeAllUsersAdmin,
  subscribeUserDevices,
  subscribeUserMemories,
  subscribeUserProfile,
  subscribeUserPurchases,
  subscribeUserSubmissions,
  UserAccountDoc,
  watchAuthState,
} from './lib/firebase';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { DownloadPage } from './pages/DownloadPage';
import { GuidePage } from './pages/GuidePage';
import { HomePage } from './pages/HomePage';
import { PricingPage } from './pages/PricingPage';
import { RemoteCallPage } from './pages/RemoteCallPage';
import { SecurityAndLegalPage } from './pages/SecurityAndLegalPage';
import {
  isAdminEmail,
  requiresManualVerification,
  sanitizeMemoryInput,
  stagePlaybookAction,
  toggleFolderAllowlist,
  transitionLedgerStatus,
} from './utils/stonicLogic';

const VISITOR_STORAGE_KEY = 'nexora_ai_visitor_v1';
const MOOD_STORAGE_KEY = 'nexora_core_mood_v1';
const OPERATOR_STORAGE_KEY = 'nexora_operator_state_v1';

interface OperatorPersistedState {
  pcPaused: boolean;
  autonomyTier: AutonomyTier;
  folders: FolderPermission[];
  ledgerEntries: ActionLedgerEntry[];
}

function loadOperatorDefaults(): OperatorPersistedState {
  const fallback: OperatorPersistedState = {
    pcPaused: false,
    autonomyTier: 'approve-first',
    folders: DEFAULT_FOLDER_PERMISSIONS,
    ledgerEntries: INITIAL_ACTION_LEDGER,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(OPERATOR_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<OperatorPersistedState>;
    return {
      pcPaused: Boolean(parsed.pcPaused),
      autonomyTier:
        parsed.autonomyTier === 'read-draft' ||
        parsed.autonomyTier === 'approve-first' ||
        parsed.autonomyTier === 'auto-pilot'
          ? parsed.autonomyTier
          : fallback.autonomyTier,
      folders: Array.isArray(parsed.folders) && parsed.folders.length > 0 ? parsed.folders : fallback.folders,
      ledgerEntries: Array.isArray(parsed.ledgerEntries) ? parsed.ledgerEntries : fallback.ledgerEntries,
    };
  } catch {
    return fallback;
  }
}

function isGitHubPagesHost(): boolean {
  return typeof window !== 'undefined' && window.location.hostname.endsWith('.github.io');
}

function parseRoute(pathname: string): AppRoute {
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (
    cleanPath === '/' ||
    cleanPath === '/pricing' ||
    cleanPath === '/cloud' ||
    cleanPath === '/download' ||
    cleanPath === '/account' ||
    cleanPath === '/admin' ||
    cleanPath === '/guide' ||
    cleanPath === '/remote' ||
    cleanPath === '/security' ||
    cleanPath === '/terms' ||
    cleanPath === '/refund' ||
    cleanPath === '/privacy'
  ) {
    return cleanPath;
  }
  return '/';
}

function getActiveRouteFromWindow(): AppRoute {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash;
  if (hash.startsWith('#/')) {
    return parseRoute(hash.slice(1));
  }
  return parseRoute(window.location.pathname);
}

function readInitialRemoteCode(): string {
  if (typeof window === 'undefined') return '';
  const searchCode = new URLSearchParams(window.location.search).get('code');
  if (searchCode) return searchCode;
  const hash = window.location.hash;
  const qIdx = hash.indexOf('?');
  if (qIdx !== -1) {
    return new URLSearchParams(hash.slice(qIdx)).get('code') || '';
  }
  return '';
}

function loadInitialMood(): CoreMood {
  if (typeof window === 'undefined') return 'standby';
  try {
    const saved = window.localStorage.getItem(MOOD_STORAGE_KEY);
    if (saved === 'standby' || saved === 'focus' || saved === 'briefing' || saved === 'night') {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'standby';
}

function loadVisitorDefaults(): { avatarForm: AvatarForm; memories: MemoryItem[] } {
  if (typeof window === 'undefined') {
    return { avatarForm: 'female', memories: DEFAULT_MEMORIES };
  }
  try {
    const raw = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!raw) return { avatarForm: 'female', memories: DEFAULT_MEMORIES };
    const parsed = JSON.parse(raw) as { avatarForm?: AvatarForm; memories?: MemoryItem[] };
    return {
      avatarForm: parsed.avatarForm || 'female',
      memories: Array.isArray(parsed.memories) ? parsed.memories : DEFAULT_MEMORIES,
    };
  } catch {
    return { avatarForm: 'female', memories: DEFAULT_MEMORIES };
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(getActiveRouteFromWindow);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserAccountDoc | null>(null);
  const [devices, setDevices] = useState<DeviceSlot[]>([]);
  const [cloudMemories, setCloudMemories] = useState<MemoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<PaymentSubmissionRecord[]>([]);
  const [adminSubmissions, setAdminSubmissions] = useState<PaymentSubmissionRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserAccountDoc[]>([]);

  const [visitorState, setVisitorState] = useState(loadVisitorDefaults);
  const [operatorState, setOperatorState] = useState<OperatorPersistedState>(loadOperatorDefaults);
  const [coreMood, setCoreMood] = useState<CoreMood>(loadInitialMood);
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [focusDurationMin, setFocusDurationMin] = useState<25 | 50>(25);
  const [focusSecondsLeft, setFocusSecondsLeft] = useState<number>(25 * 60);
  const [focusRunning, setFocusRunning] = useState<boolean>(false);
  const [remoteCodeParam, setRemoteCodeParam] = useState<string>(readInitialRemoteCode);
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlanType | null>(null);
  const [activeProof, setActiveProof] = useState<Testimonial | null>(null);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      setAuthUser(user);
      setAuthLoading(false);
      if (user) {
        void ensureUserAccount(user).catch((err) => {
          console.error('Failed to ensure Firestore user profile:', err);
        });
      } else {
        setProfile(null);
        setDevices([]);
        setCloudMemories([]);
        setPurchases([]);
        setUserSubmissions([]);
        setAdminSubmissions([]);
        setAdminUsers([]);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authUser) return;
    const uid = authUser.uid;
    const unsubProfile = subscribeUserProfile(uid, setProfile);
    const unsubDevices = subscribeUserDevices(uid, setDevices);
    const unsubMemories = subscribeUserMemories(uid, setCloudMemories);
    const unsubPurchases = subscribeUserPurchases(uid, setPurchases);
    const unsubSubmissions = subscribeUserSubmissions(uid, setUserSubmissions);

    let unsubAdminSubs: (() => void) | undefined;
    let unsubAdminUsers: (() => void) | undefined;
    if (isAdminEmail(authUser.email)) {
      unsubAdminSubs = subscribeAllSubmissionsAdmin(setAdminSubmissions);
      unsubAdminUsers = subscribeAllUsersAdmin(setAdminUsers);
    } else {
      setAdminSubmissions([]);
      setAdminUsers([]);
    }

    return () => {
      unsubProfile();
      unsubDevices();
      unsubMemories();
      unsubPurchases();
      unsubSubmissions();
      unsubAdminSubs?.();
      unsubAdminUsers?.();
    };
  }, [authUser]);

  useEffect(() => {
    if (authUser) return;
    try {
      window.localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(visitorState));
    } catch {
      // Ignore storage errors
    }
  }, [visitorState, authUser]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MOOD_STORAGE_KEY, coreMood);
    } catch {
      // Ignore storage errors
    }
  }, [coreMood]);

  useEffect(() => {
    try {
      window.localStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify(operatorState));
    } catch {
      // Ignore storage errors
    }
  }, [operatorState]);

  useEffect(() => {
    const onStorageSync = (e: StorageEvent) => {
      if (e.key === OPERATOR_STORAGE_KEY) {
        setOperatorState(loadOperatorDefaults());
      }
    };
    window.addEventListener('storage', onStorageSync);
    return () => window.removeEventListener('storage', onStorageSync);
  }, []);

  useEffect(() => {
    const syncRoute = () => {
      setRoute(getActiveRouteFromWindow());
      setRemoteCodeParam(readInitialRemoteCode());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('hashchange', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('hashchange', syncRoute);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCtrlSpace = e.ctrlKey && !e.shiftKey && !e.altKey && e.code === 'Space';
      const isCmdOrCtrlK = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k';
      if (isCtrlSpace || isCmdOrCtrlK) {
        e.preventDefault();
        setCommandBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!focusRunning) return;
    const timer = window.setInterval(() => {
      setFocusSecondsLeft((prev) => {
        if (prev <= 1) {
          setFocusRunning(false);
          playCoreChime('reply');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [focusRunning]);

  const handleStartFocusTimer = (minutes: 25 | 50) => {
    setFocusDurationMin(minutes);
    setFocusSecondsLeft(minutes * 60);
    setFocusRunning(true);
    setCoreMood('focus');
    playCoreChime('activate');
  };

  const handleToggleFocusPause = () => {
    setFocusRunning((prev) => !prev);
  };

  const handleResetFocusTimer = () => {
    setFocusRunning(false);
    setFocusSecondsLeft(focusDurationMin * 60);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && route === '/') {
        window.setTimeout(() => {
          document.getElementById('experience')?.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    }
  }, [route]);

  const navigate = (nextRoute: AppRoute, query = '') => {
    const fullUrl = `${nextRoute}${query}`;
    if (query) {
      const code = new URLSearchParams(query).get('code') || '';
      if (code) setRemoteCodeParam(code);
    } else if (nextRoute !== '/remote') {
      setRemoteCodeParam('');
    }
    if (nextRoute !== route || query) {
      if (isGitHubPagesHost() || window.location.hash.startsWith('#/')) {
        window.location.hash = `#${fullUrl}`;
      } else {
        window.history.pushState({}, '', fullUrl);
      }
      setRoute(nextRoute);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeAvatarForm: AvatarForm = authUser
    ? profile?.avatarForm || 'female'
    : visitorState.avatarForm;

  const activeMemories: MemoryItem[] = authUser
    ? cloudMemories.length > 0
      ? cloudMemories
      : DEFAULT_MEMORIES
    : visitorState.memories;

  const handleAvatarFormChange = (form: AvatarForm) => {
    if (authUser) {
      void setUserAvatarForm(authUser.uid, form);
    } else {
      setVisitorState((prev) => ({ ...prev, avatarForm: form }));
    }
  };

  const handleAddMemory = (text: string, category: MemoryItem['category']) => {
    const check = sanitizeMemoryInput(text);
    if (!check.ok) return;
    if (authUser) {
      void addMemoryFirestore(authUser.uid, check.text, category);
    } else {
      const next: MemoryItem = {
        id: `mem-${Date.now()}`,
        text: check.text,
        category,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setVisitorState((prev) => ({ ...prev, memories: [next, ...prev.memories] }));
    }
  };

  const handleDeleteMemory = (id: string) => {
    if (authUser) {
      if (cloudMemories.some((m) => m.id === id)) {
        void deleteMemoryFirestore(authUser.uid, id);
      }
    } else {
      setVisitorState((prev) => ({
        ...prev,
        memories: prev.memories.filter((m) => m.id !== id),
      }));
    }
  };

  const handleSignInGoogle = async () => {
    const user = await signInWithGoogle();
    await ensureUserAccount(user);
  };

  const handleSignOut = async () => {
    await signOutUser();
  };

  const handleUsageIncrement = () => {
    if (authUser && profile && profile.cloudPlan !== 'byok') {
      void incrementUserUsage(authUser.uid, 2, 2);
    }
  };

  const handleTogglePcPaused = () => {
    setOperatorState((prev) => {
      const nextPaused = !prev.pcPaused;
      playCoreChime(nextPaused ? 'skill' : 'activate');
      return { ...prev, pcPaused: nextPaused };
    });
  };

  const handleChangeAutonomyTier = (tier: AutonomyTier) => {
    setOperatorState((prev) => ({ ...prev, autonomyTier: tier }));
  };

  const handleToggleFolder = (folderId: string) => {
    setOperatorState((prev) => ({
      ...prev,
      folders: toggleFolderAllowlist(prev.folders, folderId),
    }));
  };

  const handleRunPlaybook = (playbook: BusinessPlaybook): { ok: boolean; reason: string } => {
    const result = stagePlaybookAction({
      entries: operatorState.ledgerEntries,
      folders: operatorState.folders,
      playbook,
      pcPaused: operatorState.pcPaused,
      activeTier: operatorState.autonomyTier,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    });

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    playCoreChime(result.mode === 'executed' ? 'reply' : 'skill');
    setOperatorState((prev) => ({
      ...prev,
      ledgerEntries: result.entries,
    }));
    return { ok: true, reason: result.reason };
  };

  const handleRunPlaybookById = (playbookId: string) => {
    const found = BUSINESS_PLAYBOOKS.find((p) => p.id === playbookId);
    if (found) {
      handleRunPlaybook(found);
    }
  };

  const handleApproveEntry = (entryId: string): { ok: boolean; error?: string } => {
    const res = transitionLedgerStatus(
      operatorState.ledgerEntries,
      entryId,
      'Executed',
      operatorState.pcPaused
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    playCoreChime('reply');
    setOperatorState((prev) => ({ ...prev, ledgerEntries: res.entries }));
    return { ok: true };
  };

  const handleRejectEntry = (entryId: string): { ok: boolean; error?: string } => {
    const res = transitionLedgerStatus(
      operatorState.ledgerEntries,
      entryId,
      'Rejected',
      operatorState.pcPaused
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    setOperatorState((prev) => ({ ...prev, ledgerEntries: res.entries }));
    return { ok: true };
  };

  const handleRevertEntry = (entryId: string): { ok: boolean; error?: string } => {
    const res = transitionLedgerStatus(
      operatorState.ledgerEntries,
      entryId,
      'Reverted',
      operatorState.pcPaused
    );
    if (!res.ok) {
      return { ok: false, error: res.error };
    }
    playCoreChime('skill');
    setOperatorState((prev) => ({ ...prev, ledgerEntries: res.entries }));
    return { ok: true };
  };

  const handleResetOperatorDemo = () => {
    setOperatorState({
      pcPaused: false,
      autonomyTier: 'approve-first',
      folders: DEFAULT_FOLDER_PERMISSIONS,
      ledgerEntries: INITIAL_ACTION_LEDGER,
    });
  };

  const handleCompletePurchase = async ({
    plan,
    email,
    method,
    referenceCode,
  }: {
    plan: CheckoutPlanType;
    email: string;
    method: string;
    cloudPlanAfter: CloudPlanId;
    referenceCode?: string;
  }): Promise<{ pendingVerification?: boolean }> => {
    if (!authUser) {
      throw new Error('Please sign in with Google before completing purchase.');
    }
    await ensureUserAccount(authUser);
    if (requiresManualVerification(method)) {
      await submitPaymentVerification({
        uid: authUser.uid,
        email: authUser.email || email,
        plan,
        method,
        rawReferenceCode: referenceCode || '',
      });
      return { pendingVerification: true };
    }
    await completePurchaseAtomic(authUser.uid, plan, method);
    return { pendingVerification: false };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07080A] text-[#F4F2ED]">
      <Navbar currentRoute={route} onNavigate={navigate} isSignedIn={Boolean(authUser)} />

      <div className="flex-1">
        {route === '/' && (
          <HomePage
            avatarForm={activeAvatarForm}
            onChangeAvatarForm={handleAvatarFormChange}
            coreMood={coreMood}
            onChangeCoreMood={setCoreMood}
            memories={activeMemories}
            onAddMemory={handleAddMemory}
            onDeleteMemory={handleDeleteMemory}
            onUsageIncrement={handleUsageIncrement}
            onNavigate={navigate}
            onOpenCheckout={setCheckoutPlan}
            onOpenProof={setActiveProof}
            focusDurationMin={focusDurationMin}
            focusSecondsLeft={focusSecondsLeft}
            focusRunning={focusRunning}
            onStartFocusTimer={handleStartFocusTimer}
            onToggleFocusPause={handleToggleFocusPause}
            onResetFocusTimer={handleResetFocusTimer}
            onOpenCommandBar={() => setCommandBarOpen(true)}
            pcPaused={operatorState.pcPaused}
            onTogglePcPaused={handleTogglePcPaused}
            autonomyTier={operatorState.autonomyTier}
            onChangeAutonomyTier={handleChangeAutonomyTier}
            folders={operatorState.folders}
            onToggleFolder={handleToggleFolder}
            ledgerEntries={operatorState.ledgerEntries}
            onRunPlaybook={handleRunPlaybook}
            onApproveEntry={handleApproveEntry}
            onRejectEntry={handleRejectEntry}
            onRevertEntry={handleRevertEntry}
            onResetOperatorDemo={handleResetOperatorDemo}
          />
        )}

        {(route === '/pricing' || route === '/cloud') && (
          <PricingPage
            mode={route === '/cloud' ? 'cloud' : 'pricing'}
            onNavigate={navigate}
            onOpenCheckout={setCheckoutPlan}
          />
        )}

        {route === '/download' && <DownloadPage onNavigate={navigate} />}

        {route === '/guide' && <GuidePage onNavigate={navigate} />}

        {(route === '/security' ||
          route === '/privacy' ||
          route === '/terms' ||
          route === '/refund') && (
          <SecurityAndLegalPage route={route} onNavigate={navigate} />
        )}

        {route === '/remote' && (
          <RemoteCallPage
            initialCode={remoteCodeParam}
            avatarForm={activeAvatarForm}
            coreMood={coreMood}
            memories={activeMemories}
            onUsageIncrement={handleUsageIncrement}
            onNavigate={navigate}
            pcPaused={operatorState.pcPaused}
            onTogglePcPaused={handleTogglePcPaused}
            ledgerEntries={operatorState.ledgerEntries}
            onApproveEntry={handleApproveEntry}
            onRejectEntry={handleRejectEntry}
          />
        )}

        {route === '/account' && (
          <AccountPage
            authLoading={authLoading}
            isSignedIn={Boolean(authUser)}
            displayName={profile?.displayName || authUser?.displayName || ''}
            userEmail={profile?.email || authUser?.email || ''}
            hasLifetime={Boolean(profile?.hasLifetime)}
            cloudPlan={profile?.cloudPlan || 'free-trial'}
            dailyUsed={profile?.dailyUsed || 0}
            monthlyUsed={profile?.monthlyUsed || 0}
            devices={devices}
            purchases={purchases}
            submissions={userSubmissions}
            onSignInGoogle={handleSignInGoogle}
            onSignOut={handleSignOut}
            onRegisterDevice={async (name, os) => {
              if (!authUser) {
                return { ok: false, error: 'Please sign in first.' };
              }
              return addDeviceAtomic(authUser.uid, name, os, devices);
            }}
            onRevokeDevice={async (deviceId) => {
              if (!authUser) return;
              await revokeDeviceAtomic(authUser.uid, deviceId);
            }}
            onChangeCloudPlan={async (plan) => {
              if (!authUser) return;
              await setUserCloudPlan(authUser.uid, plan);
            }}
            onNavigate={navigate}
          />
        )}

        {route === '/admin' && (
          <AdminPage
            authLoading={authLoading}
            isSignedIn={Boolean(authUser)}
            userEmail={authUser?.email || profile?.email || ''}
            submissions={adminSubmissions}
            users={adminUsers}
            onSignInGoogle={handleSignInGoogle}
            onReviewSubmission={reviewPaymentSubmissionAtomic}
            onNavigate={navigate}
          />
        )}
      </div>

      <Footer onNavigate={navigate} />

      {route !== '/remote' && <PreSalesWidget />}

      <CheckoutModal
        plan={checkoutPlan}
        isSignedIn={Boolean(authUser)}
        userEmail={authUser?.email || profile?.email || ''}
        onSignInWithGoogle={handleSignInGoogle}
        onClose={() => setCheckoutPlan(null)}
        onCompletePurchase={handleCompletePurchase}
      />

      <ProofModal testimonial={activeProof} onClose={() => setActiveProof(null)} />

      <CommandBarModal
        open={commandBarOpen}
        onClose={() => setCommandBarOpen(false)}
        onNavigate={navigate}
        onChangeCoreMood={setCoreMood}
        onChangeAvatarForm={handleAvatarFormChange}
        onStartFocusTimer={handleStartFocusTimer}
        onRunPlaybookById={handleRunPlaybookById}
        onTogglePcPaused={handleTogglePcPaused}
        pcPaused={operatorState.pcPaused}
      />
    </div>
  );
}
