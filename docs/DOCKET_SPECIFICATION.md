# Canonical Proposal Docket Manifest Specification

This document defines the canonical manifest representation and hashing algorithm for scientific proposal batches in the SynapseGrant Intelligent Contract.

## 1. Specification

When a research grant program is initiated, the program director commits an expected docket SHA-256 digest (`expected_docket_digest`) representing the exact batch of scientific proposals to be locked and evaluated.

During proposal submission, records are stored in append-only submission order (`index` from `0` to `count - 1`).

Before lock, submission is admission-controlled by the program director (`admission_authority`). The contract computes and records a `submission_receipt` derived from the exact program ID, proposal ID, URL, content digest, and registrar. `commit_docket` recomputes and verifies every receipt, guaranteeing that an unauthorized caller cannot poison the precommitted batch. If an admission batch is interrupted or compromised, `abort_program` provides an emergency recovery path before lock.

### Line Format

For each proposal registered in the batch, a single UTF-8 line is generated using the literal pipe delimiter `|`:

```text
<index>|<proposal_id>|<url>|<digest>\n
```

Where:
- `<index>`: Zero-based integer index of registration (`0`, `1`, `2`, ...).
- `<proposal_id>`: Exact proposal identifier string (1-128 characters, strictly no pipe `|`, CR `\r`, LF `\n`, tab `\t`, ASCII control characters, or leading/trailing whitespace).
- `<url>`: Exact public HTTP/HTTPS URL string (`http://` or `https://`, strictly no pipe `|`, whitespace, CR, LF, tab, or ASCII control characters).
- `<digest>`: 64-character lowercase hexadecimal SHA-256 digest of the canonical UTF-8 proposal abstract text.
- `\n`: Literal Unix newline character (`0x0A`).

### Delimiter Defense & Validation Rules

To prevent delimiter collision, ambiguous parsing, and parser injection:
1. **Forbidden Characters**: Any presence of the pipe delimiter (`|`), carriage return (`\r`), line feed (`\n`), horizontal tab (`\t`), or ASCII control characters (`ord < 32` or `ord == 127`) in `proposal_id`, `url`, or `digest` causes immediate validation rejection with `ERR_INVALID_*`.
2. **Whitespace Rules**: Leading or trailing whitespace is strictly disallowed. URLs cannot contain any internal spaces.
3. **Hex Digest Normalization**: Digest strings must be strictly 64 hexadecimal characters and are normalized to lowercase before hashing.

### Manifest String and Digest

The full canonical docket is the exact concatenation of all proposal lines in ascending index order:

$$\text{docket\_digest} = \text{SHA256}(\text{canonical\_docket\_string.encode('utf-8')}).\text{hexdigest}()$$

## 2. Invariants & Lifecycle Defenses

1. **Deterministic Ordering**: Lines strictly follow sequential registration index (`0`, `1`, ..., `N-1`).
2. **Field Encoding**: All fields are encoded in standard UTF-8 without byte-order marks (BOM).
3. **Exact Hash Match**: `commit_docket` computes this canonical docket string across all admitted proposals and verifies:
   $$\text{computed\_docket\_digest} == \text{expected\_docket\_digest}$$
   If there is any mismatch, `commit_docket` reverts with `ERR_DOCKET_MISMATCH`.
4. **Immutability Post-Commit**: Once committed, proposals cannot be appended or modified; only consensus thematization and dispute adjudication can update eligibility or allocations.
