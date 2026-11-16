# Security Specification — Stonic AI Phase 2

## 1. Data Invariants
1. **Strict Owner Isolation (PII Boundary)**: `/users/{userId}` stores the user's verified email address and license state. Only the authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`) may `get`, `create`, or `update` their account document. Unauthenticated or cross-user reads and collection listing (`allow list`) on `/users` are denied.
2. **Subcollection Master Gate & Identity Binding**: Every sub-document under `/users/{userId}/devices/{deviceId}`, `/users/{userId}/memories/{memoryId}`, and `/users/{userId}/purchases/{purchaseId}` requires the parent `/users/{userId}` document to exist, requires `request.auth.uid == userId`, and requires `incoming().ownerUid == request.auth.uid`.
3. **3-Device Cap Atomic Enforcement**: `users/{userId}.deviceCount` is constrained to `0..3`. Creating a device requires an atomic batch (`getAfter`) incrementing `users/{userId}.deviceCount` by `+1` (`<= 3`); deleting a device requires an atomic batch decrementing `deviceCount` by `-1` (`>= 0`).
4. **Immutable Purchase Ledger**: Purchase receipts in `/users/{userId}/purchases/{purchaseId}` are append-only (`allow update, delete: if false`).
5. **Server Timestamp Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`, and `createdAt` + `uid` + `ownerUid` are immutable after creation.
6. **Strict Key Allowlists & Size Bounds**: Every write validates required + allowed keys (`hasAll` + `hasOnly` on create, `affectedKeys().hasOnly(...)` on update), valid path ID regex (`^[a-zA-Z0-9_-]+$`), and explicit string length limits.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. **Cross-User Account Read**: Authenticated User B calls `getDoc(doc(db, 'users', userA.uid))` -> Denied (`uid != userId`).
2. **Blanket User List Scrape**: Authenticated User A calls `getDocs(collection(db, 'users'))` -> Denied (`allow list: if false`).
3. **Shadow Field Injection on Profile**: Owner creates/updates `users/{uid}` with extra field `{ isAdmin: true }` -> Denied (`hasOnly` rejects ghost key).
4. **UID Spoofing on Device**: Owner creates `users/{uid}/devices/d1` with `{ ownerUid: 'victim-uid' }` -> Denied (`ownerUid == request.auth.uid` fails).
5. **Bypassing 3-PC Slot Limit**: Owner attempts to create a 4th device when `deviceCount == 3` or without batch-incrementing `deviceCount` -> Denied (`getAfter` invariant fails).
6. **Negative / Overflow Device Count**: Owner updates `users/{uid}.deviceCount = 99` or `-1` -> Denied (range `0..3` & delta `+1/-1` check fails).
7. **Unverified Email Spoofing**: Request with `email_verified: false` tries to create `users/{uid}` -> Denied (`isVerifiedUser()` fails).
8. **Client-Forged Timestamp**: Owner creates memory with `createdAt: new Date(0)` instead of `serverTimestamp()` -> Denied (`createdAt == request.time` fails).
9. **Immutable Field Tampering**: Owner updates `users/{uid}` attempting to change `uid` or `createdAt` -> Denied (`affectedKeys().hasOnly(...)` + equality check fails).
10. **Purchase History Alteration**: Owner attempts `updateDoc` or `deleteDoc` on `users/{uid}/purchases/{id}` -> Denied (`allow update, delete: if false`).
11. **Oversized Memory Payload (DoW)**: Owner writes 50KB string into `memories/{id}.text` -> Denied (`text.size() <= 280` fails).
12. **Path ID Poisoning**: Request writes document at `/users/{uid}/devices/invalid$id!with/junk` or 500-char ID -> Denied (`isValidId` regex & size check fails).
