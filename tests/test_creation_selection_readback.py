# pyright: reportMissingImports=false, reportGeneralTypeIssues=false
"""Focused integration test covering program creation, identifier selection, and authoritative contract readback."""

from datetime import datetime, timezone
import hashlib
import json
import pytest

import genlayer as gl
from contracts.synapse_grant_allocator import (
    SynapseGrantAllocator,
    PROGRAM_ACCEPTING,
    PROGRAM_COMMITTED,
    PROGRAM_THEMATIZED,
)
from scripts.manifest_helper import compute_docket_digest

DIRECTOR = "0x4d6d430b92c6252b21278eb7a71eb61e4cc50f74"
PROPOSAL_RFP_URL = "https://raw.githubusercontent.com/9ja-maxx/synapse-grant-allocator/main/frontend/public/fixtures/program-rfp.txt"
PROPOSAL_RFP_TEXT = "Synapse Open NeuroTech & AI-Driven Decentralized Grant Program"
PROPOSAL_RFP_DIGEST = hashlib.sha256(PROPOSAL_RFP_TEXT.encode("utf-8")).hexdigest()


def get_test_deadlines() -> tuple[int, int]:
    now = int(datetime.now(timezone.utc).timestamp())
    return now + 3600, now + 7200


def test_creation_identifier_selection_and_authoritative_readback(mock_gl):
    """Verify that program creation returns the exact program identifier,

    which is selected and used for complete authoritative on-chain state readback.
    """
    allocator = SynapseGrantAllocator()
    gl.message.sender_address = DIRECTOR
    mock_gl.nondet.web.set_content(PROPOSAL_RFP_URL, PROPOSAL_RFP_TEXT)

    # 1. Prepare proposals
    raw_proposals = [
        {
            "proposal_id": "SYN-ACCESS-01",
            "url": "https://raw.githubusercontent.com/9ja-maxx/synapse-grant-allocator/main/frontend/public/fixtures/proposal-access.txt",
            "text": "OpenBCI Accessibility Suite for low-cost EEG headsets.",
        },
        {
            "proposal_id": "SYN-MONITOR-02",
            "url": "https://raw.githubusercontent.com/9ja-maxx/synapse-grant-allocator/main/frontend/public/fixtures/proposal-monitoring.txt",
            "text": "Decentralized EEG Signal Integrity Filter for brain-computer interfaces.",
        },
    ]

    for p in raw_proposals:
        p["digest"] = hashlib.sha256(p["text"].encode("utf-8")).hexdigest()
        mock_gl.nondet.web.set_content(p["url"], p["text"])

    expected_docket_digest = compute_docket_digest(raw_proposals)
    reg_deadline, dispute_deadline = get_test_deadlines()

    # 2. Program Creation
    created_id = allocator.create_program(
        rfp_url=PROPOSAL_RFP_URL,
        rfp_digest=PROPOSAL_RFP_DIGEST,
        expected_docket_digest=expected_docket_digest,
        grant_count=2,
        submission_deadline=reg_deadline,
        dispute_deadline=dispute_deadline,
    )

    # Verify returned identifier
    assert int(created_id) == 1
    selected_program_id = int(created_id)

    # 3. Authoritative Contract Readback immediately after creation
    summary_raw = allocator.get_program(selected_program_id)
    summary = json.loads(summary_raw)

    assert summary["program_id"] == selected_program_id
    assert summary["director"] == DIRECTOR.lower()
    assert summary["admission_authority"] == DIRECTOR.lower()
    assert summary["rfp_url"] == PROPOSAL_RFP_URL
    assert summary["rfp_digest"] == PROPOSAL_RFP_DIGEST
    assert summary["expected_docket_digest"] == expected_docket_digest
    assert summary["computed_docket_digest"] == ""
    assert summary["grant_count"] == 2
    assert summary["state"] == PROGRAM_ACCEPTING
    assert summary["proposal_count"] == 0
    assert summary["accepted_dispute_count"] == 0
    assert summary["pending_dispute_count"] == 0
    assert summary["total_dispute_count"] == 0

    # 4. Enroll proposals
    for p in raw_proposals:
        allocator.submit_proposal(selected_program_id, p["proposal_id"], p["url"], p["digest"])

    # 5. Authoritative Readback of registered proposals
    props_raw = allocator.get_all_proposals(selected_program_id)
    props = json.loads(props_raw)
    assert len(props) == 2
    assert props[0]["proposal_id"] == "SYN-ACCESS-01"
    assert props[0]["eligible"] is True
    assert props[1]["proposal_id"] == "SYN-MONITOR-02"

    # 6. Lock Batch & Readback Manifest Verification
    computed_digest = allocator.commit_docket(selected_program_id)
    assert computed_digest == expected_docket_digest

    state = allocator.get_program_state(selected_program_id)
    assert state == PROGRAM_COMMITTED

    docket_manifest = allocator.get_canonical_docket(selected_program_id)
    assert "SYN-ACCESS-01" in docket_manifest
    assert "SYN-MONITOR-02" in docket_manifest
