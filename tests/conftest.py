# pyright: reportGeneralTypeIssues=false, reportAttributeAccessIssue=false, reportFunctionMemberAccess=false, reportIncompatibleMethodOverride=false, reportMissingImports=false, reportUnusedImport=false, reportUnusedVariable=false
import json
from pathlib import Path
import sys
import types
from typing import Any, Callable, Dict, Generator, Optional
import pytest

_PROJECT_ROOT = str(Path(__file__).resolve().parent.parent)
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

contracts_dir = str(Path(__file__).resolve().parent.parent / "contracts")
if contracts_dir not in sys.path:
    sys.path.insert(0, contracts_dir)

scripts_dir = str(Path(__file__).resolve().parent.parent / "scripts")
if scripts_dir not in sys.path:
    sys.path.insert(0, scripts_dir)

# Mock genlayer module before contract imports
if "genlayer" not in sys.modules:
    genlayer_mod = types.ModuleType("genlayer")

    class UserError(Exception):
        pass

    class Result:
        pass

    class Return(Result):
        def __init__(self, calldata: Any):
            self.calldata = calldata

    class Rollback(Result):
        def __init__(self, error: Any):
            self.error = error

    class VM:
        UserError = UserError
        Result = Result
        Return = Return
        Rollback = Rollback

        @staticmethod
        def run_nondet(leader_fn: Callable[[], Any], validator_fn: Callable[[Result], bool]) -> Any:
            leader_res = leader_fn()
            wrapped_res = Return(leader_res)
            is_valid = validator_fn(wrapped_res)
            if not is_valid:
                raise UserError("ERR_CONSENSUS_FAILED: Validator consensus rejected leader execution")
            return leader_res

    class Message:
        def __init__(self) -> None:
            self.sender_address: str = "0x0000000000000000000000000000000000000001"

    class PublicDecorators:
        @staticmethod
        def write(fn: Any) -> Any:
            return fn

        @staticmethod
        def view(fn: Any) -> Any:
            return fn

    class Web:
        def __init__(self) -> None:
            self._storage: Dict[str, str] = {}

        def set_content(self, url: str, content: str) -> None:
            self._storage[url.strip()] = content

        def clear(self) -> None:
            self._storage.clear()

        def render(self, url: str, mode: str = "text") -> str:
            clean_url = url.strip()
            if clean_url in self._storage:
                return self._storage[clean_url]
            raise RuntimeError(f"Web render 404: {url}")

    class Nondet:
        def __init__(self) -> None:
            self.web = Web()
            self._llm_handler: Optional[Callable[[str], Any]] = None

        def set_llm_handler(self, handler: Optional[Callable[[str], Any]]) -> None:
            self._llm_handler = handler

        def exec_prompt(self, prompt: str, response_format: str = "json") -> str:
            if self._llm_handler is not None:
                res = self._llm_handler(prompt)
                if isinstance(res, str):
                    return res
                return json.dumps(res)
            return json.dumps({"domains": [], "evaluations": []})

    class Contract:
        pass

    class TreeMap(dict):
        pass

    class Array(list):
        pass

    class u256(int):
        def __new__(cls, val: int = 0):
            return super().__new__(cls, int(val))

    class Address(str):
        def __new__(cls, val: str = "0x0000000000000000000000000000000000000000"):
            return super().__new__(cls, str(val))

        @property
        def as_hex(self) -> str:
            return str(self)

    setattr(genlayer_mod, "Contract", Contract)
    setattr(genlayer_mod, "TreeMap", TreeMap)
    setattr(genlayer_mod, "Array", Array)
    setattr(genlayer_mod, "u256", u256)
    setattr(genlayer_mod, "Address", Address)
    setattr(genlayer_mod, "vm", VM())
    setattr(genlayer_mod, "message", Message())
    setattr(genlayer_mod, "public", PublicDecorators())
    setattr(genlayer_mod, "nondet", Nondet())
    setattr(genlayer_mod, "gl", genlayer_mod)

    sys.modules["genlayer"] = genlayer_mod

import genlayer as gl
from contracts.synapse_grant_allocator import SynapseGrantAllocator

_JSON_RESULT_METHODS = {
    "thematize_proposals",
    "allocate_grants",
    "adjudicate_dispute",
    "get_program",
    "get_proposal_by_index",
    "get_proposal_by_id",
    "get_all_proposals",
    "get_research_domains",
    "get_grant_allocation_roster",
    "get_dispute",
    "get_all_disputes",
}

class AbiDecodedSynapseAllocator:
    def __init__(self) -> None:
        self.raw = SynapseGrantAllocator()

    def __getattr__(self, name: str) -> Any:
        target = getattr(self.raw, name)
        if name == "file_dispute":
            return lambda prog_id, disp_type, target_ids: target(
                prog_id, disp_type, json.dumps(target_ids)
            )
        if name in _JSON_RESULT_METHODS:
            return lambda *args, **kwargs: json.loads(target(*args, **kwargs))
        return target

@pytest.fixture
def mock_gl() -> Generator[Any, None, None]:
    gl.message.sender_address = "0x0000000000000000000000000000000000000001"
    gl.nondet.web.clear()
    gl.nondet.set_llm_handler(None)
    yield gl
    gl.nondet.web.clear()
    gl.nondet.set_llm_handler(None)

@pytest.fixture
def synapse_allocator(mock_gl: Any) -> AbiDecodedSynapseAllocator:
    _ = mock_gl
    return AbiDecodedSynapseAllocator()
