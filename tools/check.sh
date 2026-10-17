#!/usr/bin/env bash
# 作業の締めに実行する確認：node tools/check.mjs を呼ぶ薄い入口
set -eu
cd "$(dirname "$0")/.."
exec node tools/check.mjs "$@"
