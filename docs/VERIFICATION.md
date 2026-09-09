# Verification Record — SynapseGrant

This document is the reviewer-facing verification record for SynapseGrant on GenLayer Studionet.

## System Identity & Parameters

- Project Name: SynapseGrant Allocator
- Network: GenLayer Studionet (Chain ID 61999)
- Repository: https://github.com/9ja-maxx/synapse-grant-allocator
- Contract Source: `contracts/synapse_grant_allocator.py`
- Test Suite: 52 automated tests in `tests/`
- Frontend: TypeScript / React SPA in `frontend/`

## Contract Verification Summary

- State Machine: `ACCEPTING` → `COMMITTED` → `THEMATIZED` → `ALLOCATED` → `CHALLENGE` → `SEALED` (with `ABORTED` pre-lock recovery).
- Cryptographic Bounds: SHA-256 preflight checks, delimiter injection defenses, admission receipts.
- Equivalence Principle: Semantic partition invariance (`domain_members`), ±10 innovation score tolerance, and 100% downstream grant award winner parity (`leader_winners == val_winners`).
- Dispute Lifecycle: Independent re-render, digest verification, and consensus re-allocation on upheld disputes.

## Automated Test Results

- Automated Pytest direct unit tests: 52 PASSED
- Manifest helper tests: PASSED
- Studio ABI compatibility tests: PASSED
