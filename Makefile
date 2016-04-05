all: build check test 

build:
	go build -o bin/pd-server pd-server/main.go

install:
	go install ./...

test:
	go test --race ./...

check:
	go get github.com/golang/lint/golint

	go tool vet . 
	go tool vet --shadow . 
	golint ./... 
	gofmt -s -l .

deps:
	go list -f '{{range .Deps}}{{printf "%s\n" .}}{{end}}{{range .TestImports}}{{printf "%s\n" .}}{{end}}' ./... | \
		sort | uniq | grep -E '[^/]+\.[^/]+/' |grep -v "pingcap/pd" | \
		awk 'BEGIN{ print "#!/bin/bash" }{ printf("go get -d %s\n", $$1) }' > deps.sh
	chmod +x deps.sh
	bash deps.sh
	rm -f deps.sh
