// Copyright 2026 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

var errPathOutsideDirectory = errors.New("path is outside the target directory")

const legacyDefaultLogStorePrefix = "dashboard-logs"

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

// resolveLegacyDefaultTaskGroupPath only accepts paths created by the old
// default log directory logic: $TMPDIR/dashboard-logs*/<task-group-id>.
// This narrow allowlist lets upgrades clean old temporary data without
// weakening the containment check for arbitrary persisted paths.
func resolveLegacyDefaultTaskGroupPath(taskGroupID uint, name string) (string, error) {
	if !filepath.IsAbs(name) {
		return "", fmt.Errorf("%w: legacy path must be absolute", errPathOutsideDirectory)
	}

	candidate, err := filepath.Abs(filepath.Clean(name))
	if err != nil {
		return "", fmt.Errorf("resolve legacy target path: %w", err)
	}
	tempDirectory, err := filepath.Abs(filepath.Clean(os.TempDir()))
	if err != nil {
		return "", fmt.Errorf("resolve temporary directory: %w", err)
	}
	legacyDirectory := filepath.Dir(candidate)
	if filepath.Dir(legacyDirectory) != tempDirectory ||
		!strings.HasPrefix(filepath.Base(legacyDirectory), legacyDefaultLogStorePrefix) ||
		filepath.Base(candidate) != strconv.FormatUint(uint64(taskGroupID), 10) {
		return "", fmt.Errorf("%w: %s", errPathOutsideDirectory, name)
	}

	info, err := os.Lstat(legacyDirectory)
	if err != nil {
		return "", fmt.Errorf("stat legacy directory: %w", err)
	}
	if !info.IsDir() || info.Mode()&os.ModeSymlink != 0 {
		return "", fmt.Errorf("%w: legacy directory is not a real directory", errPathOutsideDirectory)
	}
	return candidate, nil
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
