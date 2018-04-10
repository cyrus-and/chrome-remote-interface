#!/usr/bin/env bash

set -e

browser=$(mktemp)
js=$(mktemp)
trap "rm -f '$browser' '$js'" EXIT

base='https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json'
curl -s "$base/browser_protocol.json" >"$browser"
curl -s "$base/js_protocol.json" >"$js"
node -p '
    const protocols = process.argv.slice(1).map((path) => JSON.parse(fs.readFileSync(path)));
    protocols[0].domains.push(...protocols[1].domains);
    JSON.stringify(protocols[0], null, 4);
' "$browser" "$js" >lib/protocol.json

git diff lib/protocol.json
