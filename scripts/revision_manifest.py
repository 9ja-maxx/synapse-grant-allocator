#!/usr/bin/env python3
"""
Revision Docket Manifest Generator for SynapseGrant.
Filters out excluded or duplicate proposals and re-computes the active epoch docket digest.
"""

import argparse
import json
import sys
from manifest_helper import build_canonical_docket, compute_docket_digest


def filter_active_proposals(proposals: list[dict], excluded_ids: list[str]) -> list[dict]:
    excluded_set = set(excluded_ids)
    return [p for p in proposals if p.get("proposal_id", p.get("id")) not in excluded_set]


def main():
    parser = argparse.ArgumentParser(description="SynapseGrant Revision Docket Generator")
    parser.add_argument("json_file", type=argparse.FileType("r", encoding="utf-8"))
    parser.add_argument("--exclude", nargs="*", default=[], help="Proposal IDs to exclude")

    args = parser.parse_args()
    data = json.load(args.json_file)
    active = filter_active_proposals(data, args.exclude)

    docket_str = build_canonical_docket(active)
    docket_digest = compute_docket_digest(active)

    print(f"Active Proposals: {len(active)}")
    print(f"Revision Docket Digest: {docket_digest}")


if __name__ == "__main__":
    main()
