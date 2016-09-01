#!/usr/bin/env bash

set -e

if ! curl -s 'http://localhost:9222' >/dev/null; then
    echo 'Start Chrome with "--remote-debugging-port=9222"'
    false
fi

scripts/run-linter.sh

exec node_modules/.bin/mocha -b -t 10000
