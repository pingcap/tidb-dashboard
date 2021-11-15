// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

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
