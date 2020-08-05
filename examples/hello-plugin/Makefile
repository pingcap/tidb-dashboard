EXE_PATH := plugin-$(shell go env GOOS)-$(shell go env GOARCH).exe

example.zip: $(EXE_PATH)
	zip $@ manifest.toml icon.png $<

$(EXE_PATH):
	go build -o $@ src/main.go
