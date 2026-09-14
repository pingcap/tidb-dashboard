// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"
)

var errPathOutsideDirectory = errors.New("path is outside the target directory")

func resolvePathWithinDirectory(directory, name string) (string, error) {
	return resolvePath(directory, name, false)
}

func resolveChildPathWithinDirectory(directory, name string) (string, error) {
	return resolvePath(directory, name, true)
}

// resolveStoredChildPathWithinDirectory resolves a path persisted in the
// database. Relative persisted paths are relative to the process working
// directory, rather than to directory. This preserves compatibility with
// older versions that stored relative temporary directory paths.
func resolveStoredChildPathWithinDirectory(directory, name string) (string, error) {
	if !filepath.IsAbs(name) {
		var err error
		name, err = filepath.Abs(name)
		if err != nil {
			return "", fmt.Errorf("resolve stored target path: %w", err)
		}
	}
	return resolvePath(directory, name, true)
}

func resolvePath(directory, name string, requireChild bool) (string, error) {
	directory, err := filepath.Abs(filepath.Clean(directory))
	if err != nil {
		return "", fmt.Errorf("resolve target directory: %w", err)
	}

	candidate := name
	if !filepath.IsAbs(candidate) {
		candidate = filepath.Join(directory, candidate)
	}
	candidate, err = filepath.Abs(filepath.Clean(candidate))
	if err != nil {
		return "", fmt.Errorf("resolve target path: %w", err)
	}

	rel, err := filepath.Rel(directory, candidate)
	if err != nil {
		return "", fmt.Errorf("compare target path with directory: %w", err)
	}
	if filepath.IsAbs(rel) || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) ||
		(requireChild && rel == ".") {
		return "", fmt.Errorf("%w: %s", errPathOutsideDirectory, name)
	}
	return candidate, nil
}
