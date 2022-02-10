// Copyright 2022 PingCAP, Inc. Licensed under Apache-2.0.

package fileswap

import (
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/minio/sio"

	"github.com/pingcap/tidb-dashboard/util/nocopy"
	"github.com/pingcap/tidb-dashboard/util/rest"
	"github.com/pingcap/tidb-dashboard/util/rest/download"
)

// Controller provides a file-based data serving HTTP handler.
// Arbitrary data stream can be stored in the file in encrypted form temporarily, and then downloaded by the user later.
// As data is stored in the file, large chunk of data is supported.
//
// Note: the download token cannot be mixed in different Controller instances.
type Controller struct {
	nocopy.NoCopy

	downloadCtl *download.Controller
}

func NewController() *Controller {
	return &Controller{
		downloadCtl: download.NewController(),
	}
}

// NewFileWriter creates a writer for storing data into FS. A download token can be generated from the writer
// for downloading later. The downloading can be handled by the HandleDownloadRequest.
// This function is concurrent-safe.
func (s *Controller) NewFileWriter(tempFilePattern string) (*FileWriter, error) {
	file, err := ioutil.TempFile("", tempFilePattern)
	if err != nil {
		return nil, err
	}

	w, err := sio.EncryptWriter(file, sio.Config{Key: s.downloadCtl.Secret()})
	if err != nil {
		_ = file.Close()
		_ = os.Remove(file.Name())
		return nil, err
	}

	return &FileWriter{
		WriteCloser:    w,
		downloadServer: s.downloadCtl,
		filePath:       file.Name(),
	}, nil
}

type downloadTokenClaims struct {
	jwt.StandardClaims
	TempFileName     string
	DownloadFileName string
}

// HandleDownloadRequest handles a gin Request for serving the file in the FS by using a download token.
// The file will be removed after it is successfully served to the user.
// This function is concurrent-safe.
func (s *Controller) HandleDownloadRequest(c *gin.Context) {
	var claims downloadTokenClaims
	err := s.downloadCtl.HandleDownloadToken(c.Query("token"), &claims)
	if err != nil {
		rest.AppendError(c, rest.ErrBadRequest.Wrap(err, "Invalid download request"))
		return
	}

	file, err := os.Open(claims.TempFileName)
	if err != nil {
		if os.IsNotExist(err) {
			// It is possible that token is reused. In this case, raise invalid request error.
			rest.AppendError(c, rest.ErrBadRequest.Wrap(err, "Download file not found. Please retry."))
		} else {
			rest.AppendError(c, err)
		}
		return
	}
	defer func() {
		_ = file.Close()
		_ = os.Remove(claims.TempFileName)
	}()

	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, claims.DownloadFileName))

	_, err = sio.Decrypt(c.Writer, file, sio.Config{
		Key: s.downloadCtl.Secret(),
	})
	if err != nil {
		rest.AppendError(c, err)
		return
	}
}

type FileWriter struct {
	nocopy.NoCopy
	io.WriteCloser

	downloadServer *download.Controller
	filePath       string
}

func (fw *FileWriter) Remove() {
	_ = fw.Close()
	_ = os.Remove(fw.filePath)
}

// GetDownloadToken generates a download token for downloading this file later.
// The downloading can be handled by the Controller.HandleDownloadRequest.
// This function is concurrent-safe.
func (fw *FileWriter) GetDownloadToken(downloadFileName string, expireIn time.Duration) (string, error) {
	claims := downloadTokenClaims{
		TempFileName:     fw.filePath,
		DownloadFileName: downloadFileName,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(expireIn).Unix(),
		},
	}
	return fw.downloadServer.GetDownloadToken(claims)
}
