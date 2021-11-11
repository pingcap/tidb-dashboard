package utils

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/minio/sio"

	"github.com/pingcap/tidb-dashboard/util/rest/resterror"
)

type FSPersistConfig struct {
	TokenIssuer      string
	TokenExpire      time.Duration
	TempFilePattern  string
	DownloadFileName string
}

type FSPersistTokenBody struct {
	TempFileName     string
	TempFileKeyInHex string
	DownloadFileName string
}

// FSPersist returns a writer and corresponding download token that will persist a stream in the FS in an encrypted way.
func FSPersist(config FSPersistConfig) (io.WriteCloser, string, error) {
	file, err := ioutil.TempFile("", config.TempFilePattern)
	if err != nil {
		return nil, "", err
	}

	key := cryptopasta.NewEncryptionKey()[:]
	w, err := sio.EncryptWriter(file, sio.Config{
		Key: key,
	})
	if err != nil {
		_ = file.Close()
		_ = os.Remove(file.Name())
		return nil, "", err
	}

	keyInHex := hex.EncodeToString(key)
	tokenBody := FSPersistTokenBody{
		TempFileName:     file.Name(),
		TempFileKeyInHex: keyInHex,
		DownloadFileName: config.DownloadFileName,
	}
	tokenBodyStr, err := json.Marshal(tokenBody)
	if err != nil {
		_ = file.Close()
		_ = os.Remove(file.Name())
		return nil, "", err
	}
	// TODO: Maybe better to generate the token after `w.Close()`.
	token, err := NewJWTStringWithExpire(config.TokenIssuer, string(tokenBodyStr), config.TokenExpire)
	if err != nil {
		_ = file.Close()
		_ = os.Remove(file.Name())
		return nil, "", err
	}

	// Note: we intentionally keep the temp file not removed, so that it can be downloaded later.
	return w, token, nil
}

// FSServe serves the persisted file in the FS to the user by using the download token.
// The file will be removed after it is served to the user.
func FSServe(c *gin.Context, token string, requiredIssuer string) {
	str, err := ParseJWTString(requiredIssuer, token)
	if err != nil {
		_ = c.Error(resterror.ErrBadRequest.Wrap(err, "Invalid download request"))
		return
	}
	var tokenBody FSPersistTokenBody
	err = json.Unmarshal([]byte(str), &tokenBody)
	if err != nil {
		_ = c.Error(err)
		return
	}

	file, err := os.Open(tokenBody.TempFileName)
	if err != nil {
		if os.IsNotExist(err) {
			// It is possible that token is reused. In this case, raise invalid request error.
			_ = c.Error(resterror.ErrBadRequest.Wrap(err, "Download file not found"))
		} else {
			_ = c.Error(err)
		}
		return
	}
	defer file.Close()                      // #nosec
	defer os.Remove(tokenBody.TempFileName) // #nosec

	key, err := hex.DecodeString(tokenBody.TempFileKeyInHex)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.Writer.Header().Set("Content-type", "application/octet-stream")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, tokenBody.DownloadFileName))

	_, err = sio.Decrypt(c.Writer, file, sio.Config{
		Key: key,
	})
	if err != nil {
		_ = c.Error(err)
		return
	}
}
