test:
	@wget http://localhost:9222 -q -O /dev/null || \
	{ echo 'Start Chrome with "--remote-debugging-port=9222"'; false; }
	@./node_modules/.bin/mocha -S -b -t 10000

update-protocol:
	curl 'https://chromium.googlesource.com/chromium/blink/+/master/Source/devtools/protocol.json?format=TEXT' | base64 -d >./lib/protocol.json

.PHONY: test update-protocol
