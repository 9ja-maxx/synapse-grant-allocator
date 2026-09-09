#!/usr/bin/env python3
"""
Canonical Proposal Docket Manifest CLI Helper for SynapseGrant.

Implements the deterministic line format: <index>|<proposal_id>|<url>|<digest>\n
and computes the canonical SHA-256 docket hash.
"""

import argparse
import hashlib
import json
import sys


def validate_docket_field(value: str, field_name: str) -> str:
    cleaned = value.strip()
    if not cleaned:
        raise ValueError(f"Field '{field_name}' cannot be empty")
    for ch in cleaned:
        code = ord(ch)
        if ch in ("|", "\r", "\n", "\t") or code < 32 or code == 127:
            raise ValueError(f"Field '{field_name}' contains forbidden delimiter or control character: {repr(ch)}")
    return cleaned


def format_docket_line(index: int, proposal_id: str, url: str, digest: str) -> str:
    clean_pid = validate_docket_field(proposal_id, "proposal_id")
    clean_url = validate_docket_field(url, "url")
    clean_digest = validate_docket_field(digest, "digest").lower()

    if not (clean_url.startswith("http://") or clean_url.startswith("https://")):
        raise ValueError(f"Invalid URL scheme in '{clean_url}': must start with http:// or https://")
    if " " in clean_url:
        raise ValueError(f"URL '{clean_url}' cannot contain internal whitespace")

    if len(clean_digest) != 64 or not all(c in "0123456789abcdef" for c in clean_digest):
        raise ValueError(f"Invalid SHA-256 digest '{clean_digest}': must be 64 lowercase hex characters")

    return f"{index}|{clean_pid}|{clean_url}|{clean_digest}\n"


def build_canonical_docket(proposals: list[dict]) -> str:
    lines = []
    for idx, p in enumerate(proposals):
        pid = str(p.get("proposal_id", p.get("id", "")))
        url = str(p.get("url", ""))
        digest = str(p.get("digest", p.get("sha256", "")))
        lines.append(format_docket_line(idx, pid, url, digest))
    return "".join(lines)


def compute_docket_digest(proposals: list[dict]) -> str:
    docket_str = build_canonical_docket(proposals)
    return hashlib.sha256(docket_str.encode("utf-8")).hexdigest().lower()


def compute_text_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest().lower()


def main():
    parser = argparse.ArgumentParser(description="SynapseGrant Canonical Docket Helper")
    subparsers = parser.add_subparsers(dest="command", required=True)

    hash_text_p = subparsers.add_parser("hash-text", help="Compute SHA-256 hash of text file or stdin")
    hash_text_p.add_argument("file", nargs="?", type=argparse.FileType("r", encoding="utf-8"), default=sys.stdin)

    manifest_p = subparsers.add_parser("build-docket", help="Build canonical docket manifest and compute SHA-256 hash")
    manifest_p.add_argument("json_file", type=argparse.FileType("r", encoding="utf-8"))

    args = parser.parse_args()

    if args.command == "hash-text":
        content = args.file.read()
        digest = compute_text_sha256(content)
        print(f"SHA-256: {digest}")
    elif args.command == "build-docket":
        data = json.load(args.json_file)
        if not isinstance(data, list):
            print("Error: JSON file must contain an array of proposal objects", file=sys.stderr)
            sys.exit(1)
        docket_str = build_canonical_docket(data)
        docket_digest = compute_docket_digest(data)
        print("--- Canonical Docket Manifest ---")
        print(docket_str, end="")
        print("---------------------------------")
        print(f"Docket SHA-256 Digest: {docket_digest}")


if __name__ == "__main__":
    main()

compute_manifest_digest = compute_docket_digest
build_canonical_manifest = build_canonical_docket
