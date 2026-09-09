import { describe, it, expect } from 'vitest';
import {
  hasControlOrDelimiterChars,
  isValidExternalId,
  isValidUrl,
  isValidSha256,
  formatManifestLine,
  buildManifestString,
  computeTextDigest,
  computeManifestDigest,
} from '../src/manifest';

describe('Canonical Comment Manifest Utilities', () => {
  it('detects pipe delimiter, control characters, CR, LF, and tab', () => {
    expect(hasControlOrDelimiterChars('valid_id_123')).toBe(false);
    expect(hasControlOrDelimiterChars('id|with|pipe')).toBe(true);
    expect(hasControlOrDelimiterChars('id\rwith_cr')).toBe(true);
    expect(hasControlOrDelimiterChars('id\nwith_lf')).toBe(true);
    expect(hasControlOrDelimiterChars('id\twith_tab')).toBe(true);
    expect(hasControlOrDelimiterChars('id\x00with_null')).toBe(true);
    expect(hasControlOrDelimiterChars('id\x1Fwith_unit_sep')).toBe(true);
    expect(hasControlOrDelimiterChars('id\x7Fwith_del')).toBe(true);
  });

  it('validates external IDs strictly (1-128 chars, no delimiters, no leading/trailing whitespace)', () => {
    expect(isValidExternalId('COMMENT-001')).toBe(true);
    expect(isValidExternalId('a')).toBe(true);
    expect(isValidExternalId('a'.repeat(128))).toBe(true);
    expect(isValidExternalId('a'.repeat(129))).toBe(false);
    expect(isValidExternalId('')).toBe(false);
    expect(isValidExternalId(' COMMENT-001')).toBe(false);
    expect(isValidExternalId('COMMENT-001 ')).toBe(false);
    expect(isValidExternalId('COMMENT|001')).toBe(false);
    expect(isValidExternalId('COMMENT\n001')).toBe(false);
  });

  it('validates URLs strictly (HTTP/HTTPS, no spaces, no delimiters)', () => {
    expect(isValidUrl('https://example.gov/comments/c1.txt')).toBe(true);
    expect(isValidUrl('http://example.org/doc.pdf')).toBe(true);
    expect(isValidUrl('ftp://example.com/file')).toBe(false);
    expect(isValidUrl('https://example.gov/path with space')).toBe(false);
    expect(isValidUrl('https://example.gov/path|pipe')).toBe(false);
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl(' https://example.gov')).toBe(false);
  });

  it('validates 64-character hexadecimal SHA-256 digests', () => {
    const validDigest = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(isValidSha256(validDigest)).toBe(true);
    expect(isValidSha256(validDigest.toUpperCase())).toBe(true);
    expect(isValidSha256('e3b0c442')).toBe(false);
    expect(isValidSha256(validDigest + '0')).toBe(false);
    expect(isValidSha256(validDigest.replace('e', 'g'))).toBe(false);
    expect(isValidSha256(` ${validDigest}`)).toBe(false);
    expect(isValidSha256(`${validDigest}\n`)).toBe(false);
  });

  it('formats manifest line with exact pipe delimiters and lowercase digest', () => {
    const line = formatManifestLine(
      0,
      'DOC-1',
      'https://example.gov/c1.txt',
      'E3B0C44298FC1C149AFBF4C8996FB92427AE41E4649B934CA495991B7852B855',
    );
    expect(line).toBe('0|DOC-1|https://example.gov/c1.txt|e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n');
  });

  it('builds full manifest string in ascending registration order', () => {
    const comments = [
      {
        external_id: 'DOC-1',
        url: 'https://example.gov/c1.txt',
        digest: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
      },
      {
        external_id: 'DOC-2',
        url: 'https://example.gov/c2.txt',
        digest: '3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d',
      },
    ];

    const manifest = buildManifestString(comments);
    const expected =
      '0|DOC-1|https://example.gov/c1.txt|ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb\n' +
      '1|DOC-2|https://example.gov/c2.txt|3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d\n';

    expect(manifest).toBe(expected);
  });

  it('computes Web Crypto SHA-256 digest accurately and deterministically', async () => {
    const emptyDigest = await computeTextDigest('');
    expect(emptyDigest).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');

    const helloDigest = await computeTextDigest('hello world\n');
    expect(helloDigest).toBe('a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447');
  });

  it('computes ordering-sensitive manifest digest', async () => {
    const batchA = [
      { external_id: 'A', url: 'https://example.gov/a', digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      { external_id: 'B', url: 'https://example.gov/b', digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    ];
    const batchB = [
      { external_id: 'B', url: 'https://example.gov/b', digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      { external_id: 'A', url: 'https://example.gov/a', digest: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
    ];

    const digestA = await computeManifestDigest(batchA);
    const digestB = await computeManifestDigest(batchB);

    expect(digestA).not.toBe(digestB);
    expect(isValidSha256(digestA)).toBe(true);
    expect(isValidSha256(digestB)).toBe(true);
  });
});
