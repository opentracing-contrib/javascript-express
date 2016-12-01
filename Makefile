.PHONY: all test build
SHELL := /bin/bash

all: test build

test:
	echo "TODO test app"

build: clean
	@cp -r src dist
	@echo '✓ Copy /src to /dist'

clean:
	@rm -rf dist
	@echo '✓ Clean out dist directory'

