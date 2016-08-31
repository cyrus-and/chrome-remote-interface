lint:
	eslint .

test: lint
	@wget http://localhost:9222 -q -O /dev/null || \
	{ echo 'Start Chrome with "--remote-debugging-port=9222"'; false; }
	@./node_modules/.bin/mocha -b -t 10000

update-protocol:
	curl 'https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/core/inspector/browser_protocol.json?format=TEXT' | base64 -d >/tmp/a
	curl 'https://chromium.googlesource.com/chromium/src/+/master/third_party/WebKit/Source/platform/v8_inspector/js_protocol.json?format=TEXT' | base64 -d >/tmp/b
	node -p 'a=JSON.parse(fs.readFileSync("/tmp/a")); b=JSON.parse(fs.readFileSync("/tmp/b")); a.domains.push(...b.domains); JSON.stringify(a, null, 4)' >./lib/protocol.json

.PHONY: lint test update-protocol
