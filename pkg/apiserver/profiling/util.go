// Copyright 2020 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package profiling

import (
	"archive/zip"
	"io"
	"os"
)

func createZipPack(d *os.File, files []string) error {
	pack := zip.NewWriter(d)
	defer pack.Close()

	for _, file := range files {
		f, err := os.Open(file)
		if err != nil {
			return err
		}
		defer f.Close()
		fileInfo, err := f.Stat()
		if err != nil {
			return err
		}
		zipFile, err := pack.Create(fileInfo.Name())
		if err != nil {
			return err
		}
		_, err = io.Copy(zipFile, f)
		if err != nil {
			return err
		}
	}

	return nil
}
