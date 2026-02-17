#!/bin/bash

MAX_LOOPS=2
LOOP=0

while [ "$LOOP" -lt "$MAX_LOOPS" ]; do
    LOOP=$((LOOP + 1))
    echo "=== Loop $LOOP / $MAX_LOOPS ==="

    COMMIT=$(git rev-parse --short=6 HEAD)
    LOGFILE="agent_logs/agent_${COMMIT}.log"

    claude --dangerously-skip-permissions -p "$(cat AGENT_PROMPT.md)" &> "$LOGFILE"
done

echo "=== Completed all $LOOP loops ==="