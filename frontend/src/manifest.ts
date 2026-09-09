/**
 * Canonical Comment Manifest Format & Hashing Utilities
 *
 * Source of truth: docs/MANIFEST_FORMAT.md and contracts/public_comment_allocator.py
 */

export function hasControlOrDelimiterChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const ch = s[i];
    if (ch === '|' || ch === '\r' || ch === '\n' || ch === '\t' || code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

export function isValidSha256(digest: string): boolean {
  if (typeof digest !== 'string' || hasControlOrDelimiterChars(digest)) {
    return false;
  }
  const clean = digest.trim();
  if (clean.length !== 64 || clean !== digest) {
    return false;
  }
  return /^[0-9a-fA-F]{64}$/.test(clean);
}

export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || !url || hasControlOrDelimiterChars(url)) {
    return false;
  }
  if (url.includes(' ') || url.trim() !== url) {
    return false;
  }
  return url.startsWith('http://') || url.startsWith('https://');
}

export function isValidExternalId(extId: string): boolean {
  if (typeof extId !== 'string' || !extId || hasControlOrDelimiterChars(extId)) {
    return false;
  }
  if (extId.length < 1 || extId.length > 128 || extId.trim() !== extId) {
    return false;
  }
  return true;
}

export function formatManifestLine(
  index: number,
  externalId: string,
  url: string,
  digest: string,
): string {
  return `${index}|${externalId}|${url}|${digest.toLowerCase()}\n`;
}

export interface CommentManifestItem {
  external_id?: string;
  proposal_id?: string;
  url: string;
  digest: string;
}

export function buildManifestString(comments: readonly CommentManifestItem[]): string {
  return comments
    .map((c, i) => formatManifestLine(i, c.proposal_id || c.external_id || '', c.url, c.digest))
    .join('');
}

export async function computeTextDigest(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}

export async function computeManifestDigest(comments: readonly CommentManifestItem[]): Promise<string> {
  const manifestStr = buildManifestString(comments);
  return computeTextDigest(manifestStr);
}
