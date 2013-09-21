test:
	@wget http://localhost:9222 -q -O /dev/null || \
	{ echo 'Start Chrome with "--remote-debugging-port=9222"'; false; }
	@./node_modules/.bin/mocha -b

update-protocol:
	cd ./lib/; svn export https://svn.webkit.org/repository/webkit/trunk/Source/WebCore/inspector/Inspector.json

.PHONY: test update-protocol
