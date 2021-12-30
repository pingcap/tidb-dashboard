// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package ziputil

import (
	"archive/zip"
	"io"
	"os"
	"path/filepath"
	"time"
)

type Options func(zw *zip.Writer) error

// WithREADME returns an option to write the README file.
func WithREADME() Options {
	return func(zw *zip.Writer) error {
		const downloadREADME = `
To review the CPU profiling or heap profiling result interactively:

$ go tool pprof --http=0.0.0.0:1234 cpu_xxx.proto
`

		zipFile, err := zw.CreateHeader(&zip.FileHeader{
			Name:     "README.md",
			Method:   zip.Deflate,
			Modified: time.Now(),
		})
		if err != nil {
			return err
		}

		_, err = zipFile.Write([]byte(downloadREADME))
		if err != nil {
			return err
		}
		return nil
	}
}

// WriteZipFromFiles compresses `files` using zip and write the zip in a streaming way to the io Writer `w`.
// The files will be flattened in the zip file, i.e. `/a/b/c.txt` becomes `c.txt`.
// FIXME: This function does not handle with encrypted files on the disk.
func WriteZipFromFiles(w io.Writer, files []string, compress bool, opts ...Options) error {
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
	for _, opt := range opts {
		err := opt(zw)
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
		Name:     fileInfo.Name(),
		Method:   zipMethod,
		Modified: time.Now(),
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
