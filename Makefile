.PHONY: all test build
SHELL := /bin/bash
TESTS=$(shell cd test && ls *.js | sed s/\.js$$//)

all: test build

test: build $(TESTS)

test-ci: $(TESTS)

$(TESTS):
	NODE_ENV=test node_modules/mocha/bin/mocha -R spec --ignore-leaks --bail --timeout 60000 test/$@.js

build: clean
	@npm run-script build
	@echo '✓ Transpile to es5, output to dist'

clean:
	@rm -rf dist
	@echo '✓ Clean out dist directory'
