#!/usr/bin/env bash

header() {
    echo "--- $1 ---"
}

run-suite() {
    node_modules/.bin/mocha -b -t 10000
}

set -e

if ! curl -s 'http://localhost:9222' >/dev/null; then
    echo 'Start Chrome with "--remote-debugging-port=9222"'
    false
fi

header 'Linter'
scripts/run-linter.sh

header 'Node.js: (default)'
run-suite

for node_dir; do
    header "Node.js: '$node_dir'"
    PATH="$node_dir/bin" run-suite
done
