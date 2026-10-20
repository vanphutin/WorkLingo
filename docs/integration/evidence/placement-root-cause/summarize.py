"""Summarize retained observations, never infer an atomic historical snapshot."""
from pathlib import Path
from datetime import datetime, timezone
import json
import re

HERE = Path(__file__).resolve().parent
summary = {"matrices": {}}
for namespace in ("matrix", "matrix-fixed", "matrix-reviewed"):
    result = json.loads((HERE / namespace / "result.json").read_text(encoding="utf8"))
    cells = []
    for cell in result["cells"]:
        children = []
        for child in cell["children"]:
            log = (HERE / namespace / child["log"]).read_text(encoding="utf8")
            events = [json.loads(line) for line in log.splitlines() if line.startswith('{"event":"placement-claim"')]
            failures = []
            controls = []
            for event in events:
                if event["claimedId"] is not None:
                    continue
                jobs = event["timeline"]
                row = {"hostNow": event["hostNow"], "enteredAt": event["enteredAt"], "returnedAt": event["returnedAt"],
                       "claimDurationNs": event["claimDurationNs"], "schema": event["schema"], "jobs": jobs,
                       "locks": event["locks"], "observation": event["observation"]}
                if jobs and jobs[0]["type"] == "PLACEMENT_CLOCK_PROBE":
                    controls.append(row)
                    continue
                row["availableMinusCapturedNowMs"] = [
                    (datetime.strptime(job["availableAt"], "%Y-%m-%d %H:%M:%S.%f").replace(tzinfo=timezone.utc)
                     - datetime.fromisoformat(event["hostNow"].replace("Z", "+00:00"))).total_seconds() * 1000
                    for job in jobs]
                failures.append(row)
            children.append({"role": child["role"], "exitCode": child["exitCode"], "log": child["log"],
                             "testSummary": re.findall(r"^\s*(?:Test Files|Tests|Duration)\s+.*$", log, re.M),
                             "observedClaimEvents": len(events), "unexpectedNulls": failures, "expectedNullControls": len(controls)})
        cells.append({"name": cell["name"], "workers": cell["workers"], "load": cell["load"], "children": children})
    clocks = result.get("clockSamples", [])
    summary["matrices"][namespace] = {"sourceCommitAtLaunch": result["sourceCommit"], "result": result["result"],
        "cleanup": result["cleanup"], "cells": cells, "clockSampleCount": len(clocks),
        "databaseMinusHostReceiveMsRange": [min(float(row["databaseEpochMs"]) - row["afterMs"] for row in clocks),
                                           max(float(row["databaseEpochMs"]) - row["afterMs"] for row in clocks)] if clocks else None,
        "clockCaveat": "Query send/receive brackets and Date millisecond precision; not proof of NTP skew or the destroyed historical event."}
before = summary['matrices']['matrix']
natural_nulls = [event for cell in before['cells'] for child in cell['children'] for event in child['unexpectedNulls']]
assert len(natural_nulls) == 19
assert sorted(event['availableMinusCapturedNowMs'][0] for event in natural_nulls) == [1.0] * 18 + [2.0]
assert all(event['jobs'][0]['status'] == 'PENDING' and event['jobs'][0]['attemptCount'] == 0
           and event['jobs'][0]['dueAtCapturedNow'] is False for event in natural_nulls)
for namespace in ('matrix-fixed', 'matrix-reviewed'):
    row = summary['matrices'][namespace]
    assert row['result'] == 'PASS' and row['cleanup']
    assert all(child['exitCode'] == 0 and not child['unexpectedNulls'] for cell in row['cells'] for child in cell['children'])
(HERE / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf8")
print(json.dumps({key: {"result": row["result"], "unexpectedNulls": sum(len(child["unexpectedNulls"]) for cell in row["cells"] for child in cell["children"])} for key, row in summary["matrices"].items()}))
