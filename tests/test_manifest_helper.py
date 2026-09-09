import pytest
from manifest_helper import (
    validate_docket_field,
    format_docket_line,
    build_canonical_docket,
    compute_docket_digest,
    compute_text_sha256,
)


def test_validate_docket_field():
    assert validate_docket_field("proposal_01", "proposal_id") == "proposal_01"
    with pytest.raises(ValueError):
        validate_docket_field("prop|01", "proposal_id")
    with pytest.raises(ValueError):
        validate_docket_field("prop\n01", "proposal_id")
    with pytest.raises(ValueError):
        validate_docket_field("", "proposal_id")


def test_format_docket_line():
    line = format_docket_line(
        0, "prop-1", "https://desci.org/p1.txt", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    )
    assert line == "0|prop-1|https://desci.org/p1.txt|e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855\n"


def test_build_canonical_docket():
    proposals = [
        {"proposal_id": "p1", "url": "https://a.com", "digest": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
        {"proposal_id": "p2", "url": "https://b.com", "digest": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"},
    ]
    doc = build_canonical_docket(proposals)
    assert doc.startswith("0|p1|https://a.com|")
    assert "\n1|p2|https://b.com|" in doc


def test_compute_docket_digest():
    proposals = [
        {"proposal_id": "p1", "url": "https://a.com", "digest": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
    ]
    digest = compute_docket_digest(proposals)
    assert len(digest) == 64
    assert all(c in "0123456789abcdef" for c in digest)


def test_compute_text_sha256():
    assert compute_text_sha256("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
