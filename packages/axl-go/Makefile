BINARY_NAME=axl-agent
OUTPUT_DIR=bin
GOTOOLCHAIN=go1.25.5

.PHONY: all build clean test

all: build

build:
	GOTOOLCHAIN=$(GOTOOLCHAIN) go build -o $(OUTPUT_DIR)/$(BINARY_NAME) ./cmd/axl-agent

clean:
	rm -rf $(OUTPUT_DIR)

test:
	GOTOOLCHAIN=$(GOTOOLCHAIN) go test ./...

$(OUTPUT_DIR):
	mkdir -p $(OUTPUT_DIR)

build: $(OUTPUT_DIR)
