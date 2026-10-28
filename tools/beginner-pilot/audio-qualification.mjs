/* global fetch, AbortSignal */
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import process from 'node:process';
import console from 'node:console';
import { setTimeout } from 'node:timers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const APPROVAL = '0d1907e1de7161848f4fadeaedaf88cb656dff086c4fd1119c4edbc4bc376638';
const ENDPOINT = 'https://eastasia.tts.speech.microsoft.com/cognitiveservices/v1';
const SCOPE = 'mandate/reports/2026-10-27-beginner-r12b-gate-a-scope.json';
const INVENTORY = 'docs/qualification/beginner-pilot-audio-inventory.json';
const RUN_ID = 'worklingo-r12b-gate-a-20261027';
const STORAGE_SCOPE = 'mandate/reports/2026-10-27-beginner-gate-a-storage-scope.json';
const STORAGE_ID = 'MND-20261027-005';
const STORAGE_APPROVAL = '96a4ca63b69ec052a0bf203b81773d1dc1d6256d2d1fd291deeafb007b1e45a1';
const STORAGE_ROOT = 'D:/WorkLingoQualification/r12b-20261027/A';
const STORAGE_SID = 'S-1-5-21-3809754005-2092998575-1059868825-1001';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fail = code => { throw Error(code); };
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const xml = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function assertStorageAuthority({ original, child, mode }) {
  if (original?.proposal_hash !== APPROVAL || original.status !== 'implementing'
    || child?.proposal_hash !== STORAGE_APPROVAL || !['prepare', 'produce', 'verify'].includes(mode)
    || (mode === 'prepare' ? !['implementing', 'verified'].includes(child.status) : child.status !== 'verified')) fail('STORAGE_AUTHORITY_REQUIRED');
}

export function bindStorageScope(original, amendment) {
  const root = amendment.storage?.root;
  const map = p => { if (!p.startsWith(original.storage.root + '/')) fail('STORAGE_SCOPE_PREFIX'); return root + p.slice(original.storage.root.length); };
  const external = [...original.allowlist.externalCreate.map(map), root + '/storage-probe.json'];
  const directories = ['D:/WorkLingoQualification', 'D:/WorkLingoQualification/r12b-20261027', root, root + '/takes',
    ...original.allowlist.createDirectories.filter(p => p.startsWith(original.storage.root + '/')).map(map)];
  if (amendment.mandate !== STORAGE_ID || root !== STORAGE_ROOT || amendment.storage.expectedCreatorSid !== STORAGE_SID
    || amendment.storage.expectedOwnerSid !== STORAGE_SID || amendment.authority.existingAclModify !== false
    || !same(original.provider, amendment.provider) || !same(original.budget, amendment.budget)
    || !same(external, amendment.allowlist.externalCreate) || !same([...new Set(directories)], amendment.allowlist.createDirectories)
    || !same(amendment.allowlist.aclModifyOnlyNewDirectories, amendment.allowlist.createDirectories)
    || amendment.allowlist.existingAclModify.length !== 0) fail('STORAGE_SCOPE_INVALID');
  // Preserve the original fingerprint as provenance; immutable source scopes are
  // independently checked. No derived effective fingerprint asserts new authority.
  const effective = JSON.parse(JSON.stringify(original));
  effective.storage.root = root; effective.allowlist.externalCreate = external;
  effective.allowlist.createDirectories = [...new Set(directories)];
  return effective;
}

function validateStorageAcl(query, marker, amendment) {
  validateRootPolicy(query, marker, amendment.storage.root);
  if (query.currentSid !== STORAGE_SID || query.ownerSid !== STORAGE_SID || query.protected !== true
    || query.entries.length !== 3 || ![STORAGE_SID, 'S-1-5-18', 'S-1-5-32-544'].every(sid => query.entries.filter(e => e.sid === sid && e.type === 'Allow' && e.rights === 2032127).length === 1)) fail('STORAGE_ACL_UNSAFE');
}

export async function verifyOldHistory(amendment, io = fs) {
  const root = path.resolve(amendment.storage.oldLogicalRoot), physical = path.resolve(amendment.storage.oldPhysicalRoot);
  if (await io.realpath(root) !== physical) fail('OLD_HISTORY_PATH_CHANGED');
  const names = await io.readdir(root), expected = amendment.storage.oldMetadata.map(f => f.name);
  if (!same([...names].sort(), [...expected].sort())) fail('OLD_HISTORY_UNEXPECTED');
  for (const f of amendment.storage.oldMetadata) {
    const p = path.join(root, f.name), st = await io.lstat(p);
    if (!st.isFile() || st.isSymbolicLink() || await io.realpath(p) !== path.join(physical, f.name)
      || sha(await io.readFile(p)) !== f.sha256) fail('OLD_HISTORY_CHANGED');
  }
}

export function powershell(script, { spawn = spawnSync, env = process.env } = {}) {
  if (process.platform !== 'win32') fail('WINDOWS_ACL_REQUIRED');
  if (!env.SystemRoot || !path.win32.isAbsolute(env.SystemRoot)) fail('WINDOWS_RUNTIME_UNVERIFIED');
  // A Core host's inherited module path breaks Windows PowerShell5.1 type data.
  // Scope the native module lookup to this child; never alter OS policy/settings.
  const childEnv = { ...env, PSModulePath: path.win32.join(env.SystemRoot, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') };
  const result = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "$ErrorActionPreference='Stop'; " + script], { encoding: 'utf8', windowsHide: true, env: childEnv });
  if (result.status !== 0 || result.error) fail('WINDOWS_OPERATION_FAILED');
  return result.stdout.trim();
}
function queryWindowsAcl(directory) {
  return queryWindowsAcls([directory])[0];
}
function queryWindowsAcls(directories) {
  let result;
  const paths = directories.map(p => "'" + p.replaceAll("'", "''") + "'").join(',');
  try { result = JSON.parse(powershell(`$t=[System.Security.Principal.SecurityIdentifier]; $result=@(foreach($p in @(${paths})){ $a=Get-Acl -LiteralPath $p; @{path=$p; currentSid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; ownerSid=$a.GetOwner($t).Value; protected=$a.AreAccessRulesProtected; sddl=$a.Sddl; entries=@($a.Access | ForEach-Object { @{sid=$_.IdentityReference.Translate($t).Value; type=$_.AccessControlType.ToString(); rights=[int]$_.FileSystemRights} })} }); ConvertTo-Json -InputObject $result -Depth 5 -Compress`)); }
  catch { fail('ROOT_ACL_UNVERIFIED'); }
  if (!Array.isArray(result) || result.length !== directories.length || result.some((q, i) => q.path !== directories[i])) fail('ROOT_ACL_UNVERIFIED');
  return result;
}
const nativeStorageOs = {
  volume: async () => JSON.parse(powershell("Get-Volume -DriveLetter D | ForEach-Object { @{fileSystem=$_.FileSystemType.ToString()} } | ConvertTo-Json -Compress")),
  queryAcl: queryWindowsAcl,
  queryAcls: queryWindowsAcls,
  createDirectory: async directory => {
    // CreateDirectoryW fails if an object already exists and installs the private
    // descriptor at creation, avoiding a broad-inheritance window or ACL repair.
    powershell(`Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class QualificationDirectory {
 [StructLayout(LayoutKind.Sequential)] public struct SA { public int nLength; public IntPtr descriptor; [MarshalAs(UnmanagedType.Bool)] public bool inherit; }
 [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool ConvertStringSecurityDescriptorToSecurityDescriptor(string text, uint revision, out IntPtr descriptor, out uint size);
 [DllImport("kernel32.dll", CharSet=CharSet.Unicode, SetLastError=true)] public static extern bool CreateDirectory(string path, ref SA security);
 [DllImport("kernel32.dll")] public static extern IntPtr LocalFree(IntPtr ptr);
 public static void Create(string path, string sddl) {
  IntPtr descriptor; uint size;
  if (!ConvertStringSecurityDescriptorToSecurityDescriptor(sddl,1,out descriptor,out size)) throw new System.ComponentModel.Win32Exception();
  try { var sa=new SA {nLength=Marshal.SizeOf(typeof(SA)),descriptor=descriptor,inherit=false}; if (!CreateDirectory(path,ref sa)) throw new System.ComponentModel.Win32Exception(); }
  finally { LocalFree(descriptor); }
 }
}
'@; if([System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value -ne '${STORAGE_SID}'){throw 'Wrong SID'}; [QualificationDirectory]::Create('${directory.replaceAll("'", "''")}','O:${STORAGE_SID}G:SYD:P(A;OICI;FA;;;${STORAGE_SID})(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)')`);
  },
};
const identityOf = stat => `${stat.dev}:${stat.ino}`;
const statOrNull = (io, p) => io.lstat(p, { bigint: true }).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));

async function readRegularJson(io, p) {
  const before = await io.lstat(p, { bigint: true });
  if (!before.isFile() || before.isSymbolicLink() || before.size > 2 * 1024 * 1024 || before.nlink > 1
    || await io.realpath(p) !== p) fail('STATE_FILE_UNSAFE');
  const bytes = await io.readFile(p), after = await io.lstat(p, { bigint: true });
  if (bytes.length > 2 * 1024 * 1024 || identityOf(before) !== identityOf(after) || after.isSymbolicLink()
    || await io.realpath(p) !== p) fail('STATE_FILE_IDENTITY_CHANGED');
  return { value: JSON.parse(bytes), identity: identityOf(after), checksum: sha(bytes) };
}
async function assertStableMarker(io, p, before) {
  const after = await readRegularJson(io, p);
  if (before.identity !== after.identity || before.checksum !== after.checksum) fail('STORAGE_MARKER_CHANGED');
}
async function verifyDirectoryTree(amendment, marker, io, os, allowedFiles) {
  const directories = amendment.allowlist.createDirectories.map(p => path.resolve(p)), known = new Set(directories);
  if (!same(marker.directoryIdentities?.map(r => r.path), directories)) fail('STORAGE_TREE_INVALID');
  const acls = os.queryAcls ? await os.queryAcls(directories) : directories.map(p => os.queryAcl(p));
  for (const [i, p] of directories.entries()) {
    await assertDirectoryChain(p, directories[0], io);
    const stat = await io.lstat(p, { bigint: true });
    if (!stat.isDirectory() || identityOf(stat) !== marker.directoryIdentities[i].identity) fail('STORAGE_IDENTITY_CHANGED');
    validateStorageAcl(acls[i], marker, amendment);
    for (const name of await io.readdir(p)) {
      const target = path.join(p, name);
      if (known.has(target)) continue;
      if (!allowedFiles.has(target)) fail('STORAGE_TREE_UNEXPECTED_CONTENT');
      const file = await io.lstat(target, { bigint: true });
      if (!file.isFile() || file.isSymbolicLink() || file.nlink > 1 || await io.realpath(target) !== target) fail('STORAGE_TREE_FILE_UNSAFE');
    }
  }
}

export async function preparePrivateRoot({ amendment, scope, repository, io = fs, os = nativeStorageOs,
  verifyAuthority = () => readAuthority(repository, scope, 'prepare') }) {
  await verifyAuthority();
  const root = path.resolve(amendment.storage.root), directories = amendment.allowlist.createDirectories.map(p => path.resolve(p));
  if (amendment.storage.root !== STORAGE_ROOT || !same(scope.allowlist.createDirectories.map(p => path.resolve(p)), directories)) fail('STORAGE_SCOPE_INVALID');
  if ((await os.volume()).fileSystem !== 'NTFS') fail('STORAGE_VOLUME_REQUIRED');
  const parent = os.queryAcl('D:/'); if (parent.currentSid !== STORAGE_SID) fail('STORAGE_SID_MISMATCH');
  await assertDirectoryChain(root, root, io); await verifyOldHistory(amendment, io);
  const makeMarker = () => ({ runId: RUN_ID, root: amendment.storage.root, creatorSid: STORAGE_SID, ownerSid: STORAGE_SID, createdFromAbsent: true,
    amendmentId: STORAGE_ID, amendmentHash: STORAGE_APPROVAL });
  const existing = await Promise.all(directories.map(p => statOrNull(io, p)));
  if (existing.some(Boolean)) {
    let record;
    const markerPath = path.join(root, 'run-ownership.json');
    try { record = await readRegularJson(io, markerPath); } catch (e) { if (e.code === 'ENOENT') fail('STORAGE_EXISTING_INCOMPLETE'); throw e; }
    const marker = record.value;
    if (marker.amendmentId !== STORAGE_ID || marker.amendmentHash !== STORAGE_APPROVAL || marker.setupComplete !== true
      || !same(marker.directoryIdentities?.map(r => r.path), directories) || marker.parentAclSha256 !== sha(parent.sddl)) fail('STORAGE_EXISTING_UNOWNED');
    await verifyDirectoryTree(amendment, marker, io, os, new Set(amendment.allowlist.externalCreate.map(p => path.resolve(p))));
    await assertStableMarker(io, markerPath, record);
    return { root: amendment.storage.root, storageStatus: 'READY', probe: marker.probe, reused: true, directories: directories.length };
  }
  const identities = [], marker = makeMarker();
  for (const p of directories) {
    await verifyAuthority(); await assertDirectoryChain(p, directories[0], io);
    if (await statOrNull(io, p)) fail('STORAGE_EXISTING_UNOWNED');
    await os.createDirectory(p);
    const created = identityOf(await io.lstat(p, { bigint: true }));
    await assertDirectoryChain(p, directories[0], io); validateStorageAcl(os.queryAcl(p), marker, amendment);
    if (identityOf(await io.lstat(p, { bigint: true })) !== created || (await io.readdir(p)).length) fail('STORAGE_IDENTITY_CHANGED');
    identities.push({ path: p, identity: created });
  }
  const createdFiles = new Set();
  const checkRoot = async () => {
    await verifyAuthority();
    await verifyDirectoryTree(amendment, { ...marker, directoryIdentities: identities }, io, os, createdFiles);
  };
  const write = async (name, value) => {
    const target = path.join(root, name);
    if (!amendment.allowlist.externalCreate.some(p => path.resolve(p) === target)) fail('UNLISTED_PATH');
    await checkRoot(); await io.writeFile(target, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); createdFiles.add(target);
  };
  await write('storage-probe.json', { kind: 'synthetic-storage-probe', runId: RUN_ID });
  const probePath = path.join(root, 'storage-probe.json'), probeStat = await io.lstat(probePath, { bigint: true });
  const probeBytes = await io.readFile(probePath);
  if (sha(probeBytes) !== sha(JSON.stringify({ kind: 'synthetic-storage-probe', runId: RUN_ID }, null, 2) + '\n')
    || probeStat.isSymbolicLink() || !probeStat.isFile() || await io.realpath(probePath) !== probePath) fail('STORAGE_PROBE_FAILED');
  await checkRoot(); if (identityOf(await io.lstat(probePath, { bigint: true })) !== identityOf(probeStat)) fail('STORAGE_PROBE_IDENTITY');
  await io.unlink(probePath);
  createdFiles.delete(probePath);
  const evidence = JSON.parse(await io.readFile(path.join(amendment.storage.oldLogicalRoot, 'rights-and-tariff.json')));
  const evidenceKeys = ['checkedAt', 'tier', 'resource', 'region', 'credentialOwnerConfirmed', 'educationalInternalQa', 'educationalUseReference', 'zeroSpend', 'freeQuotaEnforced', 'pronunciationMode', 'pilotReviewer', 'source'];
  await write('rights-and-tariff.json', Object.fromEntries(evidenceKeys.filter(k => evidence[k] !== undefined).map(k => [k, evidence[k]])));
  await write('audio-qa.json', { status: 'NOT_RUN', reviews: [] });
  await write('pronunciation-decisions.json', { verdict: null, reviewer: evidence.pilotReviewer ?? null, pilot: [], pronunciationApproved: false, paceApproved: false, reason: null });
  if (os.queryAcl('D:/').sddl !== parent.sddl) fail('PARENT_ACL_CHANGED');
  await verifyOldHistory(amendment, io);
  await write('run-ownership.json', { ...marker, setupComplete: true, directoryIdentities: identities, parentAclSha256: sha(parent.sddl), probe: 'PASS', oldMetadata: amendment.storage.oldMetadata });
  await checkRoot();
  return { root: amendment.storage.root, storageStatus: 'READY', probe: 'PASS', directories: identities.length, ownerSid: STORAGE_SID, reused: false };
}
export function validateRootPolicy(query, marker, root) {
  if (!query || !/^S-1-5-21-[\d-]+$/u.test(query.currentSid ?? '') || !Array.isArray(query.entries)
    || ![query.currentSid, 'S-1-5-18', 'S-1-5-32-544'].includes(query.ownerSid)) fail('ROOT_OWNER_UNVERIFIED');
  if (!marker || marker.runId !== RUN_ID || path.resolve(marker.root ?? '') !== path.resolve(root)
    || marker.creatorSid !== query.currentSid || marker.ownerSid !== query.ownerSid || marker.createdFromAbsent !== true) fail('ROOT_MARKER_INVALID');
  const trusted = new Set([query.currentSid, 'S-1-5-18', 'S-1-5-32-544']);
  if (query.entries.some(e => !['Allow', 'Deny'].includes(e.type) || !Number.isSafeInteger(e.rights)
    || (e.type === 'Allow' && e.rights !== 0 && !trusted.has(e.sid)))) fail('ROOT_ACL_UNSAFE');
}

// Read-only, native final-path inspection includes intermediate components, even
// when the final directory does not exist. Do not replace native realpath with
// realpathSync: MSIX virtualization is invisible to the non-native implementation.
export async function assertDirectoryChain(target, root, io = fs) {
  const base = path.resolve(root); let p = path.resolve(target);
  if (p !== base && !p.startsWith(base + path.sep)) fail('UNSAFE_PATH');
  while (true) {
    const stat = await io.lstat(p).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink() || await io.realpath(p) !== p)) fail('UNSAFE_REPARSE_PATH');
    const parent = path.dirname(p); if (parent === p) break; p = parent;
  }
}

export function assertPreflight({ scope, approval, evidence, key, now }) {
  if (approval?.status !== 'implementing' || approval.proposal_hash !== APPROVAL) fail('AUTHORITY_REQUIRED');
  if (scope.gate !== 'A' || scope.provider?.url !== ENDPOINT || scope.provider.region !== 'eastasia'
    || scope.provider.voice !== 'en-US-JennyNeural' || scope.provider.resourceContext?.name !== 'video-sub-ai'
    || scope.provider.resourceContext.expectedPricingTier !== 'F0' || evidence?.tier !== 'F0'
    || evidence.region !== 'eastasia' || evidence.resource !== 'video-sub-ai') fail('F0_RESOURCE_REQUIRED');
  if (scope.provider.credentialProcessVariable !== 'WL_QUAL_AZURE_KEY' || scope.provider.envFileFallback !== false
    || typeof key !== 'string' || key.length < 16 || /[\r\n\s]/u.test(key)) fail('CREDENTIAL_REQUIRED');
  if (scope.budget?.pilotSpendCap !== 0 || scope.budget.inclusiveSpendCap !== 0 || scope.budget.paidTierOrCreditFallback !== false
    || scope.authority?.paidAzureTTS !== false || scope.authority.freeTierAzureTTS !== true || evidence.zeroSpend !== true) fail('ZERO_SPEND_REQUIRED');
  if (evidence.credentialOwnerConfirmed !== true || evidence.educationalInternalQa !== true || evidence.freeQuotaEnforced !== true
    || !evidence.educationalUseReference?.startsWith('https://learn.microsoft.com/') || !evidence.pilotReviewer
    || evidence.pronunciationMode !== 'unchanged-plain-script-review-candidates') fail('HUMAN_EVIDENCE_REQUIRED');
  const age = now - Date.parse(evidence.checkedAt);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 3600000) fail('PREFLIGHT_STALE');
}

export function requestFor(script) {
  // No source overrides or unreviewed phonemes; output stays an unselected QA candidate.
  const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="en-US-JennyNeural"><prosody rate="-15%">${xml(script.text)}</prosody></voice></speak>`;
  return { url: ENDPOINT, ssml, requestSha256: sha(ssml), countedCharacters: [...ssml].length };
}

export function inspectWav(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 44 || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WAVE' || bytes.readUInt32LE(4) + 8 !== bytes.length) fail('WAV_INVALID');
  let format, data, cursor = 12;
  while (cursor + 8 <= bytes.length) {
    const id = bytes.toString('ascii', cursor, cursor + 4), size = bytes.readUInt32LE(cursor + 4), start = cursor + 8;
    if (start + size > bytes.length) fail('WAV_TRUNCATED');
    if (id === 'fmt ') { if (format || size < 16) fail('WAV_FORMAT'); format = bytes.subarray(start, start + size); }
    if (id === 'data') { if (data) fail('WAV_DUPLICATE_DATA'); data = bytes.subarray(start, start + size); }
    cursor = start + size + size % 2;
  }
  if (cursor !== bytes.length || !format || !data?.length || data.length % 2 || format.readUInt16LE(0) !== 1
    || format.readUInt16LE(2) !== 1 || format.readUInt32LE(4) !== 24000 || format.readUInt32LE(8) !== 48000
    || format.readUInt16LE(12) !== 2 || format.readUInt16LE(14) !== 16) fail('WAV_PCM_FORMAT');
  let power = 0, mean = 0, peak = 0, clipped = 0, first = -1, last = -1, silence = 0, longest = 0;
  const n = data.length / 2;
  for (let i = 0; i < n; i++) {
    const v = data.readInt16LE(i * 2) / 32768;
    power += v * v; mean += v; peak = Math.max(peak, Math.abs(v));
    if (Math.abs(v) >= 32760 / 32768) clipped++;
    if (Math.abs(v) > .01) { if (first < 0) first = i; last = i; longest = Math.max(longest, silence); silence = 0; } else silence++;
  }
  if (first < 0 || power === 0) fail('WAV_NO_SPEECH_SIGNAL');
  if (peak >= 32767 / 32768 || clipped / n >= .001) fail('WAV_CLIPPING');
  const rmsDb = 20 * Math.log10(Math.sqrt(power / n)), durationSeconds = n / 24000;
  if (durationSeconds < .1 || durationSeconds > 60) fail('WAV_DURATION');
  const warnings = [];
  if (rmsDb < -35 || rmsDb > -12) warnings.push('RMS_RANGE');
  if (Math.abs(mean / n) > .01) warnings.push('DC_OFFSET');
  if (first / 24000 > .75 || (n - 1 - last) / 24000 > .75) warnings.push('EDGE_SILENCE');
  if (longest / 24000 > 1.5) warnings.push('INTERNAL_SILENCE');
  return { checksum: sha(bytes), byteSize: bytes.length, sampleRate: 24000, channels: 1, bits: 16, mimeType: 'audio/wav', durationSeconds, rmsDb, peakDb: 20 * Math.log10(peak), warnings };
}

const nonempty = s => typeof s === 'string' && s.trim().length > 0;
const binds = (r, c) => r.path === c.path && r.fileSha256 === c.checksum && r.sourceSha256 === c.sourceSha256
  && r.requestSha256 === c.requestSha256 && r.scriptSha256 === c.scriptSha256;
function currentReview(c, qa) {
  if (!Array.isArray(qa.reviews)) fail('STATE_QA_INVALID');
  const reviews = qa.reviews.filter(r => binds(r, c));
  if (reviews.some(r => !['PASS', 'REJECTED'].includes(r.verdict) || !nonempty(r.reviewer) || !Number.isFinite(Date.parse(r.reviewedAt)))) fail('STATE_QA_INVALID');
  reviews.sort((a, b) => Date.parse(b.reviewedAt) - Date.parse(a.reviewedAt));
  if (reviews.length > 1 && reviews[0].reviewedAt === reviews[1].reviewedAt) fail('STATE_QA_CONFLICT');
  return reviews[0];
}
function matchingReview(c, qa) {
  const r = currentReview(c, qa);
  return r?.verdict === 'PASS' && c.warnings.every(w => r.acceptedWarnings?.includes(w) && nonempty(r.warningReasons?.[w])) ? r : null;
}
function metricsFor(bytes, script) {
  const metrics = inspectWav(bytes), observedWpm = script.words / metrics.durationSeconds * 60;
  if (observedWpm < 90 || observedWpm > 150) metrics.warnings.push('PACE_REVIEW');
  return { ...metrics, observedWpm };
}

function validateState(receipts, manifest, inventory) {
  const scripts = new Map(inventory.lessons.flatMap(l => l.scripts.map(s => [s.slug, { l, s }])));
  const paths = new Set(), occurrences = new Set();
  for (const c of manifest.candidates) {
    const item = scripts.get(c.slug);
    if (!item || c.lesson !== item.l.code || !Number.isInteger(c.take) || c.take < 1 || c.take > 3
      || c.path !== `takes/${c.slug}/take-${c.take}.wav` || paths.has(c.path)) fail('STATE_CANDIDATE_INVALID');
    paths.add(c.path);
  }
  for (const r of receipts) {
    const item = scripts.get(r.slug), token = `${r.slug}/${r.take}`;
    if (!item || r.lesson !== item.l.code || !Number.isInteger(r.take) || r.take < 1 || r.take > 3
      || occurrences.has(token) || r.status !== 'COMPLETE' || !Number.isFinite(r.dispatchedAt) || r.dispatchedAt !== r.startedAt
      || r.spendUSD !== 0) fail('STATE_RECEIPT_INVALID');
    const request = requestFor(item.s);
    if (r.requestSha256 !== request.requestSha256 || r.countedCharacters !== request.countedCharacters
      || r.sourceSha256 !== item.l.sourceSha256 || r.scriptSha256 !== item.s.scriptSha256) fail('STATE_RECEIPT_INVALID');
    const candidates = manifest.candidates.filter(c => c.slug === r.slug && c.take === r.take);
    if (candidates.length !== 1) fail('STATE_RECEIPT_CANDIDATE_MISMATCH');
    occurrences.add(token);
  }
  if (manifest.candidates.length !== receipts.length) fail('STATE_HISTORY_INCOMPLETE');
  for (const slug of scripts.keys()) {
    const takes = receipts.filter(r => r.slug === slug).map(r => r.take).sort((a, b) => a - b);
    if (takes.some((t, i) => t !== i + 1)) fail('STATE_TAKES_INVALID');
  }
}

export class QualificationRunner {
  constructor(options) { Object.assign(this, options); this.busy = false; }
  preflight() { assertPreflight({ ...this, now: this.clock.now() }); }
  async verifyCandidate(c, lesson, script) {
    const request = requestFor(script);
    if (c.sourceSha256 !== lesson.sourceSha256 || c.scriptSha256 !== script.scriptSha256 || c.requestSha256 !== request.requestSha256) fail('CACHED_FINGERPRINT_STALE');
    const bytes = await this.store.readCandidate(c.path);
    if (sha(bytes) !== c.checksum) fail('CACHED_CHECKSUM_MISMATCH');
    const measured = metricsFor(bytes, script);
    if (Object.entries(measured).some(([k, v]) => JSON.stringify(c[k]) !== JSON.stringify(v))
      || c.ssml !== request.ssml || c.countedCharacters !== request.countedCharacters
      || JSON.stringify(c.bindings) !== JSON.stringify(script.listeningActivities)) fail('CACHED_METRIC_MISMATCH');
    return measured;
  }
  async run({ lesson, all = false, verifyOnly = false } = {}) {
    if (this.busy) fail('BUSY'); this.busy = true;
    try {
      this.preflight(); await this.store.assertAuthority(); await this.store.assertSafe();
      return await this.store.withLock(async () => {
        const lessons = all ? this.inventory.lessons : this.inventory.lessons.filter(l => l.code === lesson);
        if (!lessons.length || (!all && lessons.length !== 1)) fail('LESSON_UNKNOWN');
        for (const l of this.inventory.lessons) await this.store.verifySource(l);
        const savedReceipts = await this.store.readJson('requests.json', null);
        const savedManifest = await this.store.readJson('asset-manifest.json', null);
        if (savedManifest && !savedReceipts) fail('STATE_HISTORY_MISSING');
        const receipts = savedReceipts ?? [];
        const manifest = savedManifest ?? { schemaVersion: 1, runId: RUN_ID, candidates: [], contentReady: false };
        const qa = await this.store.readJson('audio-qa.json', { reviews: [] });
        if (!Array.isArray(receipts) || receipts.some(r => !r || !Number.isSafeInteger(r.countedCharacters) || r.countedCharacters < 0
          || !Number.isFinite(r.startedAt) || r.startedAt < 0 || !['STARTED', 'COMPLETE', 'HALTED'].includes(r.status) || typeof r.slug !== 'string')
          || !Array.isArray(manifest.candidates) || manifest.runId !== RUN_ID) fail('STATE_INVALID');
        if (receipts.some(r => r.status === 'HALTED')) fail('RUN_HALTED');
        if (receipts.some(r => r.status === 'STARTED')) fail('AMBIGUOUS_PREVIOUS_REQUEST');
        validateState(receipts, manifest, this.inventory);
        for (const l of this.inventory.lessons) for (const s of l.scripts) {
          if (sha(s.text) !== s.scriptSha256) fail('SCRIPT_HASH_MISMATCH');
          for (const c of manifest.candidates.filter(c => c.slug === s.slug)) await this.verifyCandidate(c, l, s);
        }
        const pilot = this.inventory.lessons.find(l => l.code === 'MG01-L1');
        const decision = await this.store.readJson('pronunciation-decisions.json', null);
        const pilotReviewed = decision?.verdict === 'PASS' && nonempty(decision.reviewer) && Number.isFinite(Date.parse(decision.reviewedAt))
          && decision.pronunciationApproved === true && decision.paceApproved === true && nonempty(decision.reason)
          && Array.isArray(decision.pilot) && decision.pilot.length === pilot?.scripts.length
          && pilot.scripts.every(s => manifest.candidates.some(c => c.slug === s.slug && matchingReview(c, qa)?.reviewer === decision.reviewer
            && decision.pilot.filter(r => binds(r, c)).length === 1));
        if (!verifyOnly && (all || lesson !== 'MG01-L1') && !pilotReviewed) fail('PILOT_QA_REQUIRED');
        for (const l of lessons) for (const script of l.scripts) {
          if (sha(script.text) !== script.scriptSha256) fail('SCRIPT_HASH_MISMATCH');
          const existing = manifest.candidates.filter(c => c.slug === script.slug);
          for (const c of existing) await this.verifyCandidate(c, l, script);
          const reusable = existing.find(c => currentReview(c, qa)?.verdict !== 'REJECTED');
          if (verifyOnly || reusable) continue;
          const request = requestFor(script), attempts = receipts.filter(r => r.slug === script.slug), pilotReceipts = receipts.filter(r => r.lesson === 'MG01-L1');
          if (receipts.length >= Math.min(72, this.scope.budget.maxCalls) || attempts.length >= Math.min(3, this.scope.budget.maxTakesPerScript)
            || receipts.reduce((n, r) => n + r.countedCharacters, 0) + request.countedCharacters > Math.min(10000, this.scope.budget.maxCountedCharacters)
            || (l.code === 'MG01-L1' && (pilotReceipts.length >= Math.min(9, this.scope.budget.pilotMaxCalls)
              || pilotReceipts.reduce((n, r) => n + r.countedCharacters, 0) + request.countedCharacters > Math.min(1000, this.scope.budget.pilotMaxCountedCharacters)))) fail('BUDGET_LIMIT');
          this.preflight(); await this.store.assertAuthority(); await this.store.assertSafe(); await this.store.verifySource(l);
          const take = attempts.length + 1, candidatePath = `takes/${script.slug}/take-${take}.wav`;
          await this.store.prepareCandidate(candidatePath);
          const receipt = { lesson: l.code, slug: script.slug, take, status: 'STARTED', startedAt: this.clock.now(), countedCharacters: request.countedCharacters, requestSha256: request.requestSha256, sourceSha256: l.sourceSha256, scriptSha256: script.scriptSha256, spendUSD: 0, requestId: null };
          receipts.push(receipt); await this.store.writeJson('requests.json', receipts);
          try {
            // A durable STARTED reservation precedes dispatch. Only actual dispatch
            // timestamps schedule calls; slow fsync/ACL queries cannot compress them.
            while (true) {
              this.preflight(); await this.store.assertAuthority(); await this.store.assertSafe(); await this.store.verifySource(l);
              const starts = receipts.filter(r => r !== receipt).map(r => r.dispatchedAt).sort((a, b) => a - b);
              const earliest = Math.max((starts.at(-1) ?? -Infinity) + 10000, (starts.at(-6) ?? -Infinity) + 60001);
              if (this.clock.now() >= earliest) break;
              await this.clock.sleep(earliest - this.clock.now());
            }
            await this.store.prepareCandidate(candidatePath);
            receipt.startedAt = this.clock.now(); receipt.dispatchedAt = receipt.startedAt;
            const response = await this.transport({ ...request, headers: { 'Content-Type': 'application/ssml+xml', 'Ocp-Apim-Subscription-Key': this.key, 'X-Microsoft-OutputFormat': 'riff-24khz-16bit-mono-pcm' } });
            if (response.status !== 200) fail(`PROVIDER_${Number.isInteger(response.status) ? response.status : 'INVALID'}`);
            const metrics = metricsFor(response.bytes, script);
            await this.store.verifySource(l); await this.store.writeCandidate(candidatePath, response.bytes);
            manifest.candidates.push({ lesson: l.code, slug: script.slug, take, path: candidatePath, ...metrics, sourceSha256: l.sourceSha256, scriptSha256: script.scriptSha256, requestSha256: request.requestSha256, ssml: request.ssml, countedCharacters: request.countedCharacters, voice: 'en-US-JennyNeural', locale: 'en-US', region: 'eastasia', provider: 'azure-speech', toolVersion: 'qualification-f0-v1', selected: false, reviewer: null, supersedes: existing.at(-1)?.path ?? null, bindings: script.listeningActivities, rightsReference: this.evidence.educationalUseReference });
            await this.store.writeJson('asset-manifest.json', manifest);
            receipt.status = 'COMPLETE'; receipt.requestId = /^[A-Za-z0-9-]{1,100}$/u.test(response.requestId ?? '') ? response.requestId : null;
            await this.store.writeJson('requests.json', receipts);
          } catch (e) {
            receipt.status = 'HALTED'; receipt.failureCode = /^PROVIDER_\d{3}$|^WAV_[A-Z_]+$|^SOURCE_[A-Z_]+$|^F0_RESOURCE_REQUIRED$|^AUTHORITY_REVOKED$/u.test(e?.message ?? '') ? e.message : 'REQUEST_FAILED';
            await this.store.writeJson('requests.json', receipts); fail(receipt.failureCode);
          }
        }
        for (const c of manifest.candidates) { c.selected = Boolean(matchingReview(c, qa)); c.reviewer = c.selected ? matchingReview(c, qa).reviewer : null; }
        if (new Set(manifest.candidates.filter(c => c.selected).map(c => c.slug)).size !== manifest.candidates.filter(c => c.selected).length) fail('DUPLICATE_SELECTION');
        if (manifest.candidates.length) await this.store.writeJson('asset-manifest.json', manifest);
        const selected = manifest.candidates.filter(c => c.selected).length;
        const exact24 = this.inventory.lessons.flatMap(l => l.scripts).length === 24 && this.inventory.lessons.every(l => l.scripts.every(s => manifest.candidates.filter(c => c.slug === s.slug && c.selected).length === 1));
        return { candidates: manifest.candidates.length, selected, calls: receipts.length, countedCharacters: receipts.reduce((n, r) => n + r.countedCharacters, 0), spendUSD: 0, contentReady: false, audioStatus: exact24 && pilotReviewed ? 'AUDIO_QA_COMPLETE_OFFLINE_ONLY' : 'HUMAN_QA_REQUIRED' };
      });
    } finally { this.busy = false; }
  }
}

// Real side effects are confined to this store and the CLI; tests use in-memory data.
export class FileStore {
  constructor(root, scope, repository, amendment = null, { io = fs, queryAcl = queryWindowsAcl } = {}) {
    this.root = path.resolve(root); this.scope = scope; this.repository = repository; this.amendment = amendment; this.io = io; this.queryAcl = queryAcl;
    this.queryAcls = queryAcl === queryWindowsAcl ? queryWindowsAcls : directories => directories.map(p => queryAcl(p));
    this.allowed = new Set(scope.allowlist.externalCreate.map(p => path.resolve(p)));
  }
  resolve(relative) {
    if (path.isAbsolute(relative) || path.win32.isAbsolute(relative) || relative.split(/[\\/]/u).some(s => s === '..' || s === '') || !/^[a-zA-Z0-9/._-]+$/u.test(relative)) fail('UNSAFE_PATH');
    const p = path.resolve(this.root, relative);
    if (!this.allowed.has(p) || !p.startsWith(this.root + path.sep)) fail('UNLISTED_PATH');
    return p;
  }
  async assertSafe() {
    await assertDirectoryChain(this.root, this.root, this.io);
    const markerPath = this.resolve('run-ownership.json'), record = await readRegularJson(this.io, markerPath), marker = record.value;
    if (this.amendment) await verifyDirectoryTree(this.amendment, marker, this.io, { queryAcls: this.queryAcls }, this.allowed);
    else this.assertPrivateDirectory(this.root, marker);
    if (this.amendment && (marker.amendmentId !== STORAGE_ID || marker.amendmentHash !== STORAGE_APPROVAL || marker.setupComplete !== true
      || marker.directoryIdentities?.find(r => r.path === this.root)?.identity !== identityOf(await this.io.lstat(this.root, { bigint: true })))) fail('STORAGE_MARKER_INVALID');
    await assertStableMarker(this.io, markerPath, record);
  }
  assertPrivateDirectory(directory, marker) {
    const query = this.queryAcl(directory);
    if (this.amendment) validateStorageAcl(query, marker, this.amendment);
    else validateRootPolicy(query, marker, this.root);
  }
  async readJson(name, fallback) {
    const p = this.resolve(name);
    try { return (await readRegularJson(this.io, p)).value; }
    catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
  }
  async writeJson(name, value) {
    const target = this.resolve(name), temp = this.resolve(name + '.tmp'); await this.assertSafe();
    const st = await this.io.lstat(target).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (st && (!st.isFile() || st.isSymbolicLink())) fail('UNSAFE_METADATA');
    await this.io.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); await this.io.rename(temp, target);
  }
  async readCandidate(relative) { const p = this.resolve(relative), st = await this.io.lstat(p); if (!st.isFile() || st.isSymbolicLink() || st.size > 20 * 1024 * 1024 || await this.io.realpath(p) !== p) fail('CANDIDATE_PATH_UNSAFE'); return this.io.readFile(p); }
  async prepareCandidate(relative) {
    const target = this.resolve(relative), parent = path.dirname(target);
    await this.assertSafe(); await assertDirectoryChain(parent, this.root, this.io);
    const marker = await this.readJson('run-ownership.json', null);
    let p = this.root;
    for (const part of path.relative(this.root, parent).split(path.sep)) {
      await assertDirectoryChain(p, this.root, this.io); this.assertPrivateDirectory(p, marker);
      p = path.join(p, part);
      try { await this.io.mkdir(p); } catch (e) { if (e.code !== 'EEXIST') throw e; }
      await assertDirectoryChain(p, this.root, this.io); this.assertPrivateDirectory(p, marker);
    }
    // Cached candidates are immutable: never charge for a take whose destination exists.
    if (await this.io.lstat(target).then(() => true, e => e.code === 'ENOENT' ? false : Promise.reject(e))) fail('CANDIDATE_EXISTS');
  }
  async writeCandidate(relative, bytes) {
    const p = this.resolve(relative);
    await this.assertSafe(); await assertDirectoryChain(path.dirname(p), this.root, this.io);
    this.assertPrivateDirectory(path.dirname(p), await this.readJson('run-ownership.json', null));
    await this.io.writeFile(p, bytes, { flag: 'wx' });
  }
  async verifySource(lesson) { if (sha(await this.io.readFile(path.resolve(this.repository, lesson.sourcePath))) !== lesson.sourceSha256) fail('SOURCE_HASH_STALE'); }
  async assertAuthority() { await readAuthority(this.repository, this.scope); }
  async withLock(fn) {
    const lock = this.resolve('run-ownership.json.tmp'); let handle;
    try { handle = await this.io.open(lock, 'wx'); await handle.writeFile(JSON.stringify({ runId: RUN_ID, pid: process.pid })); } catch { fail('RUN_LOCKED'); }
    try { return await fn(); } finally { await handle.close(); await this.io.unlink(lock); }
  }
}

async function realTransport(request) {
  let response;
  try { response = await fetch(request.url, { method: 'POST', body: request.ssml, headers: request.headers, redirect: 'manual', signal: AbortSignal.timeout(30000) }); } catch { fail('PROVIDER_NETWORK'); }
  if (response.status !== 200) { await response.body?.cancel(); return { status: response.status, requestId: null }; }
  const chunks = []; let length = 0;
  for await (const chunk of response.body) { length += chunk.length; if (length > 20 * 1024 * 1024) fail('PROVIDER_RESPONSE_TOO_LARGE'); chunks.push(chunk); }
  return { status: 200, bytes: Buffer.concat(chunks), requestId: response.headers.get('x-requestid') };
}

export async function readAuthority(repository, scope, mode = 'produce', { io = fs, runGit = args => spawnSync('git', ['-c', `safe.directory=${repository.replaceAll('\\', '/')}`, ...args], { cwd: repository, encoding: 'utf8', windowsHide: true }) } = {}) {
  const rawOriginal = (await io.readFile(path.join(repository, SCOPE), 'utf8')).replace(/\r\n/gu, '\n');
  const rawChild = (await io.readFile(path.join(repository, STORAGE_SCOPE), 'utf8')).replace(/\r\n/gu, '\n');
  const original = JSON.parse(rawOriginal), amendment = JSON.parse(rawChild);
  if (!same(bindStorageScope(original, amendment), scope)) fail('EFFECTIVE_SCOPE_CHANGED');
  for (const record of [original, amendment]) {
    for (const f of record.frozenArtifacts) if (sha((await io.readFile(path.resolve(repository, f.path), 'utf8')).replace(/\r\n/gu, '\n')) !== f.sha256LF) fail('FROZEN_ARTIFACT_CHANGED');
    for (const f of (record.baseline.files ?? record.baseline.protectedFiles).filter(f => f.sha256)) if (sha(await io.readFile(path.resolve(repository, f.path))) !== f.sha256) fail('PROTECTED_SOURCE_CHANGED');
    for (const name of ['allowlist', 'baseline']) { const { fingerprint, ...v } = record[name]; if (sha(JSON.stringify(canonical(v))) !== fingerprint) fail('SCOPE_FINGERPRINT_CHANGED'); }
    if (runGit(['merge-base', '--is-ancestor', record.baseline.head, 'HEAD']).status !== 0 || runGit(['branch', '--show-current']).stdout.trim() !== record.baseline.branch) fail('BASELINE_ANCESTRY');
  }
  const { proposalHash } = await import('../../.agents/skills/mandate-steward/scripts/model.mjs');
  const approvalFor = async (id, expected, rawScope) => {
    const names = (await io.readdir(path.join(repository, 'mandate/items'))).filter(n => n.startsWith(id + '-'));
    if (names.length !== 1) fail('PROPOSAL_AUTHORITY_MISSING');
    const m = (await io.readFile(path.join(repository, 'mandate/items', names[0]), 'utf8')).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/u);
    if (!m) fail('PROPOSAL_AUTHORITY_INVALID');
    const item = JSON.parse(m[1]);
    if (proposalHash(item, m[2]) !== expected || !m[2].includes(sha(rawScope)) || item.approval?.proposal_hash !== expected) fail('PROPOSAL_AUTHORITY_CHANGED');
    return { status: item.status, proposal_hash: item.approval.proposal_hash };
  };
  const parentApproval = await approvalFor('MND-20261027-002', APPROVAL, rawOriginal), childApproval = await approvalFor(STORAGE_ID, STORAGE_APPROVAL, rawChild);
  assertStorageAuthority({ original: parentApproval, child: childApproval, mode });
  return { ...parentApproval, storageApproval: childApproval };
}

async function main() {
  const args = process.argv.slice(2), valid = ['prepare --gate A --storage-only', 'produce --gate A --lesson MG01-L1', 'produce --gate A --all', 'verify --gate A --all'];
  if (!valid.includes(args.join(' '))) fail('EXACT_ARGV_REQUIRED');
  const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const original = JSON.parse(await fs.readFile(path.join(repository, SCOPE), 'utf8'));
  const amendment = JSON.parse(await fs.readFile(path.join(repository, STORAGE_SCOPE), 'utf8')), scope = bindStorageScope(original, amendment);
  const approval = await readAuthority(repository, scope, args[0]);
  if (args[0] === 'prepare') { console.log(JSON.stringify(await preparePrivateRoot({ amendment, scope, repository }))); return; }
  for (const binary of scope.externalTools) if (sha(await fs.readFile(binary.path)) !== binary.sha256) fail('EXTERNAL_TOOL_CHANGED');
  await verifyOldHistory(amendment);
  const inventory = JSON.parse(await fs.readFile(path.join(repository, INVENTORY), 'utf8')), store = new FileStore(scope.storage.root, scope, repository, amendment);
  await store.assertSafe();
  const evidence = await store.readJson('rights-and-tariff.json', null);
  const clock = { now: () => Date.now(), sleep: ms => new Promise(resolve => setTimeout(resolve, ms)) };
  const runner = new QualificationRunner({ scope, approval, inventory, store, evidence, key: process.env.WL_QUAL_AZURE_KEY, clock, transport: realTransport });
  console.log(JSON.stringify(await runner.run({ lesson: args[4], all: args.includes('--all'), verifyOnly: args[0] === 'verify' })));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(/^[A-Z][A-Z0-9_]+$/u.test(error?.message ?? '') ? error.message : 'QUALIFICATION_FAILED'); process.exitCode = 1;
});
