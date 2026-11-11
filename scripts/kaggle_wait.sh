#!/usr/bin/env bash
# usage: KAGGLE_API_TOKEN=... scripts/kaggle_wait.sh <owner>/<kernel> [max_minutes]
# Polls the kernel status every 60 seconds until it completes, fails or is cancelled.
REF="$1"; MAXMIN="${2:-9}"
for i in $(seq 1 "$MAXMIN"); do
  OUT=$(kaggle kernels status "$REF" 2>&1)
  S=$(echo "$OUT" | grep -oiE 'COMPLETE|ERROR|CANCEL[A-Z_]*|RUNNING|QUEUED' | head -1)
  echo "[$i] ${S:-UNKNOWN}"
  case "$S" in
    COMPLETE) exit 0;;
    ERROR|CANCEL*) exit 2;;
  esac
  sleep 60
done
exit 3
