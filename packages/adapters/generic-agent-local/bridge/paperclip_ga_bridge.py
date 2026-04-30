#!/usr/bin/env python3
import argparse
import json
import os
import queue
import sys
import threading
import traceback
from pathlib import Path


def emit(event):
    print(json.dumps(event, ensure_ascii=False), flush=True)


def probe(root):
    required = ["agentmain.py", "ga.py", "llmcore.py", "mykey.py"]
    missing = [name for name in required if not (root / name).exists()]
    if missing:
        emit({"type": "generic_agent.error", "message": "Missing files: " + ", ".join(missing)})
        return 1
    emit({"type": "generic_agent.system", "text": "GenericAgent bridge probe passed."})
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generic-agent-root", required=True)
    parser.add_argument("--cwd")
    parser.add_argument("--input-file")
    parser.add_argument("--session-id")
    parser.add_argument("--llm-no", type=int, default=0)
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--probe", action="store_true")
    args = parser.parse_args()

    root = Path(args.generic_agent_root).resolve()
    if args.probe:
        return probe(root)

    if not args.input_file:
        emit({"type": "generic_agent.error", "message": "--input-file is required"})
        return 2
    if not args.cwd:
        emit({"type": "generic_agent.error", "message": "--cwd is required"})
        return 2

    sys.path.insert(0, str(root))
    os.chdir(str(root))

    session_id = args.session_id or "generic-agent-session"
    task_dir = root / "temp" / "paperclip-sessions" / session_id
    task_dir.mkdir(parents=True, exist_ok=True)

    try:
        from agentmain import GeneraticAgent
    except Exception as exc:
        emit({
            "type": "generic_agent.error",
            "message": "Failed to import GenericAgent: " + repr(exc),
            "traceback": traceback.format_exc(),
        })
        return 1

    prompt = Path(args.input_file).read_text(encoding="utf-8")
    workspace = str(Path(args.cwd).resolve())
    prompt = (
        f"[Paperclip workspace]\n"
        f"Target cwd: {workspace}\n"
        f"Use absolute paths under this cwd for files and commands.\n\n"
        f"{prompt}"
    )

    try:
        agent = GeneraticAgent()
        agent.next_llm(args.llm_no)
        agent.verbose = args.verbose
        agent.inc_out = True
        agent.task_dir = str(task_dir)
        model = agent.get_llm_name(model=True)

        emit({
            "type": "generic_agent.init",
            "session_id": session_id,
            "runtime_root": str(root),
            "cwd": workspace,
            "model": model,
        })

        worker = threading.Thread(target=agent.run, daemon=True)
        worker.start()
        display_queue = agent.put_task(prompt, source="paperclip")

        while True:
            try:
                item = display_queue.get(timeout=120)
            except queue.Empty:
                emit({"type": "generic_agent.system", "text": "Waiting for GenericAgent output..."})
                continue

            if "next" in item:
                text = str(item.get("next") or "")
                if text:
                    emit({"type": "generic_agent.delta", "text": text})

            if "done" in item:
                text = str(item.get("done") or "")
                emit({"type": "generic_agent.result", "session_id": session_id, "text": text})
                return 0

    except KeyboardInterrupt:
        emit({"type": "generic_agent.error", "message": "Interrupted"})
        return 130
    except Exception as exc:
        emit({
            "type": "generic_agent.error",
            "message": repr(exc),
            "traceback": traceback.format_exc(),
        })
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
