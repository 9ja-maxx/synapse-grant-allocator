import re
import os
from pathlib import Path


def test_studio_safe_abi():
    possible_paths = [
        Path(__file__).resolve().parent.parent / "contracts" / "synapse_grant_allocator.py",
        Path("contracts/synapse_grant_allocator.py"),
        Path("synapse-grant-allocator/contracts/synapse_grant_allocator.py"),
    ]
    contract_file = next((p for p in possible_paths if p.exists()), None)
    assert contract_file is not None, "Could not find contracts/synapse_grant_allocator.py"

    with open(contract_file, "r") as f:
        content = f.read()

    # Verify Intelligent Contract inherits gl.Contract
    assert "class SynapseGrantAllocator(gl.Contract):" in content
    # Verify depends header
    assert '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }' in content
    # Verify write and view decorators
    assert "@gl.public.write" in content
    assert "@gl.public.view" in content

