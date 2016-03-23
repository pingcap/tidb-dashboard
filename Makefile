all: build check test 

build:
	go build -o bin/pd-server pd-server/main.go

install:
	go install ./...

test:
	go test --race ./...

check:
	go tool vet . 
	go tool vet --shadow . 
	golint ./... 
	gofmt -s -l .