package main

import (
	"log"
	"net/http"

	"github.com/shurcooL/vfsgen"
)

func main() {
	var fs http.FileSystem = http.Dir("ui/build")
	err := vfsgen.Generate(fs, vfsgen.Options{
		BuildTags:    "ui_server",
		PackageName:  "uiserver",
		VariableName: "assets",
	})
	if err != nil {
		log.Fatalln(err)
	}
}
