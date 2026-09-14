// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"bytes"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
)

func TestJeprofDoesNotInterpretProfileURLAsShell(t *testing.T) {
	if _, err := exec.LookPath("perl"); err != nil {
		t.Skip("perl is not installed")
	}

	dir := t.TempDir()
	fetcherPath := filepath.Join(dir, "jeprof-test-fetcher")
	if err := os.WriteFile(fetcherPath, []byte("#!/bin/sh\nexit 0\n"), 0o755); err != nil {
		t.Fatal(err)
	}

	marker := "jeprof-command-executed"
	maliciousHost := "127.0.0.1'';touch " + marker + ";echo '''"
	profileURL := "http://" + maliciousHost + ":20180/pprof/heap"

	cmd := exec.Command("perl", "/dev/stdin", "--raw", profileURL)
	cmd.Dir = dir
	cmd.Stdin = strings.NewReader(jeprof)
	cmd.Stdout = &bytes.Buffer{}
	cmd.Stderr = &bytes.Buffer{}
	cmd.Env = append(os.Environ(),
		"URL_FETCHER=jeprof-test-fetcher",
		"JEPROF_TMPDIR="+dir,
		"PATH="+dir+string(os.PathListSeparator)+os.Getenv("PATH"),
	)
	_ = cmd.Run()

	if _, err := os.Stat(filepath.Join(dir, marker)); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("profile URL was interpreted as shell input, stat error: %v", err)
	}
}
