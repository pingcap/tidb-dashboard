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

package utils

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
)

func StreamZipPack(w io.Writer, files []string, needCompress bool) error {
	pack := zip.NewWriter(w)
	defer pack.Close()

	for _, file := range files {
		err := streamZipFile(pack, file, needCompress)
		if err != nil {
			return err
		}
	}

	return nil
}

func streamZipFile(zipPack *zip.Writer, file string, needCompress bool) error {
	f, err := os.Open(filepath.Clean(file))
	if err != nil {
		return err
	}
	defer f.Close() // #nosec

	fileInfo, err := f.Stat()
	if err != nil {
		return err
	}

	zipMethod := zip.Store // no compress
	if needCompress {
		zipMethod = zip.Deflate // compress
	}
	zipFile, err := zipPack.CreateHeader(&zip.FileHeader{
		Name:   fileInfo.Name(),
		Method: zipMethod,
	})
	if err != nil {
		return err
	}

	_, err = io.Copy(zipFile, f)
	if err != nil {
		return err
	}

	return nil
}
