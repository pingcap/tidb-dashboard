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

package ziputil

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
)

// WriteZipFromFiles compresses `files` using zip and write the zip in a streaming way to the io Writer `w`.
// The files will be flattened in the zip file, i.e. `/a/b/c.txt` becomes `c.txt`.
// FIXME: This function does not handle with encrypted files on the disk.
func WriteZipFromFiles(w io.Writer, files []string, compress bool) error {
	zw := zip.NewWriter(w)
	defer func() {
		_ = zw.Close()
	}()

	// TODO: Handle with duplicate file names.
	for _, file := range files {
		err := writeZipFromFile(zw, file, compress)
		if err != nil {
			return err
		}
	}

	return nil
}

func writeZipFromFile(zw *zip.Writer, file string, compress bool) error {
	f, err := os.Open(filepath.Clean(file))
	if err != nil {
		return err
	}
	defer func() {
		_ = f.Close()
	}()

	fileInfo, err := f.Stat()
	if err != nil {
		return err
	}

	zipMethod := zip.Store // no compress
	if compress {
		zipMethod = zip.Deflate // compress
	}
	zipFile, err := zw.CreateHeader(&zip.FileHeader{
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
