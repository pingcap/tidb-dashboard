all: build check test 

build:
	go build ./...

install:
	go install ./...

test:
	go test --race ./...

check:
	go tool vet . 
	go tool vet --shadow . 
	# skip protopb lint check.
	golint ./... | grep -vE 'protopb/' | awk '{print} END{if(NR>0) {exit 1}}'
	gofmt -s -l .