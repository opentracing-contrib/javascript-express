.PHONY: all test build
SHELL := /bin/bash

all: test build

test:
	echo "TODO test app"

build: clean
	@npm run-script build
	@echo '✓ Transpile to es5, output to dist'

clean:
	@rm -rf dist
	@echo '✓ Clean out dist directory'

