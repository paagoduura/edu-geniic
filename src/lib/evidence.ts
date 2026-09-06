export const MAX_EVIDENCE_BYTES = 250 * 1024 * 1024;
export const ALLOWED_EVIDENCE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'text/plain',
  'application/zip',
]);

export type EvidenceValidation = { valid: true } | { valid: false; reason: string };

export const validateEvidenceFile = (file: Pick<File, 'size' | 'type' | 'name'>): EvidenceValidation => {
  if (!file.name.trim() || file.name.length > 180) return { valid: false, reason: 'Invalid file name.' };
  if (file.size <= 0) return { valid: false, reason: 'The file is empty.' };
  if (file.size > MAX_EVIDENCE_BYTES) return { valid: false, reason: 'The file exceeds the 250 MB evidence limit.' };
  if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) return { valid: false, reason: 'This file type is not supported.' };
  return { valid: true };
};

export const safeEvidenceObjectPath = (schoolId: string, learnerId: string, evidenceId: string, fileName: string): string => {
  const safeName = fileName.normalize('NFKC').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return `schools/${encodeURIComponent(schoolId)}/learners/${encodeURIComponent(learnerId)}/evidence/${encodeURIComponent(evidenceId)}/${safeName}`;
};

export const sha256 = async (data: ArrayBuffer): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
