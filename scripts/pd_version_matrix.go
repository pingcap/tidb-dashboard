// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

// This proram can be used to generate a version relationship matrix for TiDB Dashboard and PD.

package main

import (
	"flag"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/codeskyblue/go-sh"
	"github.com/olekukonko/tablewriter"
	"github.com/pingcap/log"
	"go.uber.org/zap"
	"golang.org/x/mod/modfile"
	"golang.org/x/mod/semver"
)

var pdGitDir string
var dashboardGitDir = flag.String("dashboard", "", "TiDB Dashboard git path")
var outputFormat = flag.String("format", "mdtable", "Output format, accept values: text, mdtable, mdtable-link")

func mustSuccess(err error) {
	if err != nil {
		log.Fatal("Execute failed", zap.Error(err))
	}
}

func listPDTags() []string {
	output, err := sh.Command("git", "tag", sh.Dir(pdGitDir)).Output()
	mustSuccess(err)
	validTags := make([]string, 0)
	pdTags := strings.Split(string(output), "\n")
	for _, pdTag := range pdTags {
		if !semver.IsValid(pdTag) {
			continue
		}
		validTags = append(validTags, pdTag)
	}
	sort.SliceStable(validTags, func(i, j int) bool {
		return semver.Compare(validTags[i], validTags[j]) < 0
	})
	return validTags
}

func lookupDashboardCommit(pdTag string) string {
	output, err := sh.Command(
		"git", "show", fmt.Sprintf("%s:go.mod", pdTag),
		sh.Dir(pdGitDir)).Output()
	mustSuccess(err)

	f, err := modfile.Parse("go.mod", output, nil)
	mustSuccess(err)
	for _, r := range f.Require {
		if r.Mod.Path != "github.com/pingcap-incubator/tidb-dashboard" &&
			r.Mod.Path != "github.com/pingcap/tidb-dashboard" {
			continue
		}
		if !semver.IsValid(r.Mod.Version) {
			continue
		}
		versionSegments := strings.Split(r.Mod.Version, "-")
		gitHash := versionSegments[2]
		return gitHash
	}

	return ""
}

func lookupDashboardRelease(gitCommit string) string {
	sess := sh.NewSession()
	sess.Stderr = nil
	output, err := sess.
		Command("git", "show", fmt.Sprintf("%s:release-version", gitCommit), sh.Dir(*dashboardGitDir)).
		Output()
	if err != nil {
		// It might be possible that the TiDB Dashboard is not using a calver.
		return ""
	}

	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if len(line) > 0 && !strings.HasPrefix(line, "#") {
			return line
		}
	}

	return ""
}

func lookupPDTagUpdateTime(pdTag string) string {
	output, err := sh.Command(
		"git", "log", "-1", "--format=%cI", pdTag,
		sh.Dir(pdGitDir)).Output()
	mustSuccess(err)

	t, err := time.Parse(time.RFC3339, strings.TrimSpace(string(output)))
	mustSuccess(err)

	return t.UTC().Format("2006-01-02")
}

func main() {
	flag.Parse()

	if flag.NArg() < 1 {
		fmt.Println("Usage: go run pd_version_matrix.go <pd_git_path>")
		os.Exit(1)
		return
	}

	pdGitDir = flag.Arg(0)
	output := make([][]string, 0)

	pdTags := listPDTags()
	for _, pdTag := range pdTags {
		if strings.Count(pdTag, "-") > 0 {
			continue
		}
		if semver.Compare(pdTag, "v4.0.0") < 0 {
			continue
		}
		tagAt := lookupPDTagUpdateTime(pdTag)
		dashboardCommit := lookupDashboardCommit(pdTag)
		if dashboardCommit == "" {
			continue
		}
		dashboardRelease := lookupDashboardRelease(dashboardCommit)
		if dashboardRelease == "" {
			continue
		}

		output = append(output, []string{pdTag, tagAt, dashboardRelease})
	}

	switch *outputFormat {
	case "mdtable", "mdtable-link":
		if *outputFormat == "mdtable-link" {
			for _, row := range output {
				row[2] = fmt.Sprintf("[%s](https://github.com/pingcap/tidb-dashboard/releases/tag/v%s)", row[2], row[2])
			}
		}
		table := tablewriter.NewWriter(os.Stdout)
		table.SetHeader([]string{"PD Version", "PD Commit At", "TiDB Dashboard Version"})
		table.SetBorders(tablewriter.Border{Left: true, Top: false, Right: true, Bottom: false})
		table.SetCenterSeparator("|")
		table.AppendBulk(output)
		table.Render()
	default:
		for _, row := range output {
			fmt.Printf("%s: %s\n", row[0], row[1], row[2])
		}
	}
}
