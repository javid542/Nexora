import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AvatarForm,
  CloudPlanId,
  DeviceSlot,
  MemoryItem,
  PaymentSubmissionRecord,
  PurchaseRecord,
} from '../data/stonicData';
import {
  buildPurchaseSummary,
  canActivateDevice,
  generateSafeEntityId,
  MAX_DEVICE_NAME_LENGTH,
  MAX_DEVICES,
  sanitizeMemoryInput,
  sanitizeReceiptReference,
} from '../utils/stonicLogic';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
void testConnection();

export interface UserAccountDoc {
  uid: string;
  email: string;
  displayName: string;
  avatarForm: AvatarForm;
  hasLifetime: boolean;
  cloudPlan: CloudPlanId;
  dailyUsed: number;
  monthlyUsed: number;
  deviceCount: number;
}

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function watchAuthState(cb: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

export async function ensureUserAccount(user: User): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const safeEmail = (user.email || 'user@nexoraai.com').slice(0, 254);
      const safeDisplayName = (
        user.displayName ||
        safeEmail.split('@')[0] ||
        'NexoraAI User'
      ).slice(0, 100);
      await setDoc(ref, {
        uid: user.uid,
        email: safeEmail,
        displayName: safeDisplayName,
        avatarForm: 'female',
        hasLifetime: false,
        cloudPlan: 'free-trial',
        dailyUsed: 0,
        monthlyUsed: 0,
        deviceCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeUserProfile(
  uid: string,
  onProfile: (profile: UserAccountDoc | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onProfile(null);
        return;
      }
      const d = snap.data();
      onProfile({
        uid: String(d.uid || uid),
        email: String(d.email || ''),
        displayName: String(d.displayName || 'NexoraAI User'),
        avatarForm: (d.avatarForm as AvatarForm) || 'female',
        hasLifetime: Boolean(d.hasLifetime),
        cloudPlan: (d.cloudPlan as CloudPlanId) || 'free-trial',
        dailyUsed: Number(d.dailyUsed || 0),
        monthlyUsed: Number(d.monthlyUsed || 0),
        deviceCount: Number(d.deviceCount || 0),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeUserDevices(
  uid: string,
  onDevices: (devices: DeviceSlot[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/devices`;
  const q = query(collection(db, 'users', uid, 'devices'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: Array<DeviceSlot & { _ts: number }> = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : 0;
        return {
          id: docSnap.id,
          name: String(d.name || 'Windows PC'),
          os: String(d.os || 'Windows 11 x64'),
          lastActive: String(d.lastActive || 'Just now'),
          status: d.status === 'Standby' ? 'Standby' : 'Active',
          _ts: ts,
        };
      });
      items.sort((a, b) => a._ts - b._ts);
      onDevices(items.map(({ _ts: _unused, ...rest }) => rest));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeUserMemories(
  uid: string,
  onMemories: (memories: MemoryItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/memories`;
  const q = query(collection(db, 'users', uid, 'memories'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: Array<MemoryItem & { _ts: number }> = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : 0;
        return {
          id: docSnap.id,
          text: String(d.text || ''),
          category:
            d.category === 'identity' || d.category === 'context'
              ? d.category
              : 'preference',
          createdAt: String(d.createdDate || new Date().toISOString().slice(0, 10)),
          _ts: ts,
        };
      });
      items.sort((a, b) => b._ts - a._ts);
      onMemories(items.map(({ _ts: _unused, ...rest }) => rest));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeUserPurchases(
  uid: string,
  onPurchases: (purchases: PurchaseRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `users/${uid}/purchases`;
  const q = query(collection(db, 'users', uid, 'purchases'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items: Array<PurchaseRecord & { _ts: number }> = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : 0;
        return {
          id: docSnap.id,
          item: String(d.item || ''),
          amount: String(d.amount || ''),
          method: String(d.method || ''),
          date: String(d.orderDate || new Date().toISOString().slice(0, 10)),
          status: d.status === 'Completed' ? 'Completed' : 'Active',
          _ts: ts,
        };
      });
      items.sort((a, b) => b._ts - a._ts);
      onPurchases(items.map(({ _ts: _unused, ...rest }) => rest));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function setUserAvatarForm(uid: string, avatarForm: AvatarForm): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      avatarForm,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function setUserCloudPlan(uid: string, cloudPlan: CloudPlanId): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      cloudPlan,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementUserUsage(
  uid: string,
  dailyDelta = 2,
  monthlyDelta = 2
): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      dailyUsed: increment(Math.max(1, Math.round(dailyDelta))),
      monthlyUsed: increment(Math.max(1, Math.round(monthlyDelta))),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addDeviceAtomic(
  uid: string,
  deviceName: string,
  os: string,
  existingDevices: DeviceSlot[]
): Promise<{ ok: true } | { ok: false; error: string }> {
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
  if (!canActivateDevice(existingDevices, MAX_DEVICES)) {
    return {
      ok: false,
      error: `Maximum of ${MAX_DEVICES} active devices reached. Revoke an existing device first.`,
    };
  }
  const duplicate = existingDevices.some(
    (d) => d.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { ok: false, error: 'A device with that name is already registered.' };
  }

  const deviceId = generateSafeEntityId('dev');
  const safeOs = os === 'Windows 10 x64' ? 'Windows 10 x64' : 'Windows 11 x64';
  const path = `users/${uid}/devices/${deviceId}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'devices', deviceId), {
      id: deviceId,
      ownerUid: uid,
      name: trimmed,
      os: safeOs,
      status: 'Active',
      lastActive: 'Just now',
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', uid), {
      deviceCount: increment(1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return { ok: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function revokeDeviceAtomic(uid: string, deviceId: string): Promise<void> {
  const path = `users/${uid}/devices/${deviceId}`;
  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'users', uid, 'devices', deviceId));
    batch.update(doc(db, 'users', uid), {
      deviceCount: increment(-1),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function addMemoryFirestore(
  uid: string,
  rawText: string,
  category: MemoryItem['category']
): Promise<void> {
  const check = sanitizeMemoryInput(rawText);
  if (!check.ok) return;
  const memoryId = generateSafeEntityId('mem');
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    await setDoc(doc(db, 'users', uid, 'memories', memoryId), {
      id: memoryId,
      ownerUid: uid,
      text: check.text,
      category,
      createdDate: new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMemoryFirestore(uid: string, memoryId: string): Promise<void> {
  const path = `users/${uid}/memories/${memoryId}`;
  try {
    await setDocOrDelete(uid, memoryId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

async function setDocOrDelete(uid: string, memoryId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'users', uid, 'memories', memoryId));
}

export async function completePurchaseAtomic(
  uid: string,
  plan: 'lifetime' | 'basic' | 'power',
  method: string
): Promise<void> {
  const summary = buildPurchaseSummary(plan);
  const purchaseId = generateSafeEntityId('ord');
  const path = `users/${uid}/purchases/${purchaseId}`;

  try {
    const batch = writeBatch(db);
    if (plan === 'lifetime') {
      batch.update(doc(db, 'users', uid), {
        hasLifetime: true,
        cloudPlan: summary.cloudPlanAfter,
        updatedAt: serverTimestamp(),
      });
    } else {
      batch.update(doc(db, 'users', uid), {
        cloudPlan: summary.cloudPlanAfter,
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'users', uid, 'purchases', purchaseId), {
      id: purchaseId,
      ownerUid: uid,
      planId: plan,
      item: summary.item.slice(0, 80),
      amount: summary.amount.slice(0, 24),
      method: method.trim().slice(0, 40) || 'Card',
      status: 'Active',
      orderDate: new Date().toISOString().slice(0, 10),
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitPaymentVerification(params: {
  uid: string;
  email: string;
  plan: 'lifetime' | 'basic' | 'power';
  method: string;
  rawReferenceCode: string;
}): Promise<PaymentSubmissionRecord> {
  const refCheck = sanitizeReceiptReference(params.rawReferenceCode);
  if (!refCheck.ok) {
    throw new Error(refCheck.error);
  }

  const summary = buildPurchaseSummary(params.plan);
  const submissionId = generateSafeEntityId('sub');
  const submittedDate = new Date().toISOString().slice(0, 10);
  const safeMethod = params.method.trim().slice(0, 40) || 'Bank Transfer';
  const safeEmail = params.email.trim().slice(0, 254);
  const path = `payment_submissions/${submissionId}`;

  try {
    await setDoc(doc(db, 'payment_submissions', submissionId), {
      id: submissionId,
      ownerUid: params.uid,
      ownerEmail: safeEmail,
      planId: params.plan,
      item: summary.item.slice(0, 80),
      amount: summary.amount.slice(0, 24),
      method: safeMethod,
      referenceCode: refCheck.referenceCode,
      status: 'Pending',
      reviewerNote: '',
      submittedDate,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return {
      id: submissionId,
      ownerUid: params.uid,
      ownerEmail: safeEmail,
      planId: params.plan,
      item: summary.item,
      amount: summary.amount,
      method: safeMethod,
      referenceCode: refCheck.referenceCode,
      status: 'Pending',
      reviewerNote: '',
      submittedDate,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

function mapSubmissionDoc(docSnap: { id: string; data: () => Record<string, unknown> }): PaymentSubmissionRecord & { _ts: number } {
  const d = docSnap.data();
  const ts = d.createdAt instanceof Timestamp ? d.createdAt.toMillis() : 0;
  const planId =
    d.planId === 'basic' || d.planId === 'power' ? d.planId : 'lifetime';
  const status =
    d.status === 'Approved' || d.status === 'Rejected' ? d.status : 'Pending';
  return {
    id: docSnap.id,
    ownerUid: String(d.ownerUid || ''),
    ownerEmail: String(d.ownerEmail || ''),
    planId,
    item: String(d.item || ''),
    amount: String(d.amount || ''),
    method: String(d.method || ''),
    referenceCode: String(d.referenceCode || ''),
    status,
    reviewerNote: String(d.reviewerNote || ''),
    submittedDate: String(d.submittedDate || new Date().toISOString().slice(0, 10)),
    _ts: ts,
  };
}

export function subscribeUserSubmissions(
  uid: string,
  onSubmissions: (items: PaymentSubmissionRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'payment_submissions';
  const q = query(collection(db, 'payment_submissions'), where('ownerUid', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map(mapSubmissionDoc);
      items.sort((a, b) => b._ts - a._ts);
      onSubmissions(items.map(({ _ts: _unused, ...rest }) => rest));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeAllSubmissionsAdmin(
  onSubmissions: (items: PaymentSubmissionRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'payment_submissions';
  return onSnapshot(
    collection(db, 'payment_submissions'),
    (snap) => {
      const items = snap.docs.map(mapSubmissionDoc);
      items.sort((a, b) => b._ts - a._ts);
      onSubmissions(items.map(({ _ts: _unused, ...rest }) => rest));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeAllUsersAdmin(
  onUsers: (users: UserAccountDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'users';
  return onSnapshot(
    collection(db, 'users'),
    (snap) => {
      const users: UserAccountDoc[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          uid: String(d.uid || docSnap.id),
          email: String(d.email || ''),
          displayName: String(d.displayName || 'NexoraAI User'),
          avatarForm: (d.avatarForm as AvatarForm) || 'female',
          hasLifetime: Boolean(d.hasLifetime),
          cloudPlan: (d.cloudPlan as CloudPlanId) || 'free-trial',
          dailyUsed: Number(d.dailyUsed || 0),
          monthlyUsed: Number(d.monthlyUsed || 0),
          deviceCount: Number(d.deviceCount || 0),
        };
      });
      onUsers(users);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function reviewPaymentSubmissionAtomic(params: {
  submission: PaymentSubmissionRecord;
  decision: 'Approved' | 'Rejected';
  reviewerNote?: string;
}): Promise<void> {
  const { submission, decision, reviewerNote = '' } = params;
  const cleanNote = reviewerNote.trim().slice(0, 240);
  const path = `payment_submissions/${submission.id}`;

  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'payment_submissions', submission.id), {
      status: decision,
      reviewerNote: cleanNote,
      updatedAt: serverTimestamp(),
    });

    if (decision === 'Approved') {
      const summary = buildPurchaseSummary(submission.planId);
      const userRef = doc(db, 'users', submission.ownerUid);
      if (submission.planId === 'lifetime') {
        batch.update(userRef, {
          hasLifetime: true,
          cloudPlan: summary.cloudPlanAfter,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.update(userRef, {
          cloudPlan: summary.cloudPlanAfter,
          updatedAt: serverTimestamp(),
        });
      }

      const purchaseId = generateSafeEntityId('ord');
      batch.set(doc(db, 'users', submission.ownerUid, 'purchases', purchaseId), {
        id: purchaseId,
        ownerUid: submission.ownerUid,
        planId: submission.planId,
        item: submission.item.slice(0, 80),
        amount: submission.amount.slice(0, 24),
        method: submission.method.slice(0, 40),
        status: 'Active',
        orderDate: new Date().toISOString().slice(0, 10),
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

