#!/bin/bash

MAX_LOOPS=2
COUNTER_FILE="agent_logs/.loop_counter"

# Restore persisted counter or start at 0
if [ -f "$COUNTER_FILE" ]; then
    LOOP=$(cat "$COUNTER_FILE")
else
    LOOP=0
fi

RUNS=0

while [ "$RUNS" -lt "$MAX_LOOPS" ]; do
    LOOP=$((LOOP + 1))
    RUNS=$((RUNS + 1))
    echo "=== Run $RUNS / $MAX_LOOPS (Counter $LOOP) ==="

    # Persist counter before the run
    echo "$LOOP" > "$COUNTER_FILE"

    COMMIT=$(git rev-parse --short=6 HEAD)
    LOGFILE="agent_logs/agent_${LOOP}_${COMMIT}.log"

    claude --dangerously-skip-permissions -p "$(cat AGENT_PROMPT.md)" &> "$LOGFILE"
done
echo "=== Completed $RUNS runs (counter at $LOOP) ==="

if [ "$LOOP" -ge "$MAX_LOOPS" ]; then

    COMMIT=$(git rev-parse --short=6 HEAD)
    LOGFILE="agent_logs/agent_AUDIT1_${COMMIT}.log"

    claude --dangerously-skip-permissions -p "$(cat AGENT_PROMPT_AUDIT.md)" &> "$LOGFILE"
    echo "=== Completed AUDIT 1 ==="

    COMMIT=$(git rev-parse --short=6 HEAD)
    LOGFILE="agent_logs/agent_AUDIT2_${COMMIT}.log"

    claude --dangerously-skip-permissions -p "$(cat AGENT_PROMPT_AUDIT.md)" &> "$LOGFILE"
    echo "=== Completed AUDIT 2 ==="

fi
