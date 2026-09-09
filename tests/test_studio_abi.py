import re
import os


def test_studio_safe_abi():
    with open("synapse-grant-allocator/contracts/synapse_grant_allocator.py", "r") as f:
        content = f.read()

    # Verify Intelligent Contract inherits gl.Contract
    assert "class SynapseGrantAllocator(gl.Contract):" in content
    # Verify depends header
    assert '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }' in content
    # Verify write and view decorators
    assert "@gl.public.write" in content
    assert "@gl.public.view" in content
