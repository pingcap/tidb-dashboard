package main

import (
	"log"
	"net/http"
	"os"

	"github.com/shurcooL/vfsgen"
)

func main() {
	buildTag := ""
	if len(os.Args) > 1 {
		buildTag = os.Args[1]
	}
	var fs http.FileSystem = http.Dir("ui/build")
	err := vfsgen.Generate(fs, vfsgen.Options{
		BuildTags:    buildTag,
		PackageName:  "uiserver",
		VariableName: "assets",
	})
	if err != nil {
		log.Fatalln(err)
	}

	// convert speedscope
	fs = http.Dir("ui_speedscope/dist")
	err = vfsgen.Generate(fs, vfsgen.Options{
		PackageName:  "uiserver",
		VariableName: "SpeedscopeAssets",
	})
	if err != nil {
		log.Fatalln(err)
	}
}
