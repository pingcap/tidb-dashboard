package utils

import (
	"encoding/base64"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"strings"

	"github.com/Xeoncross/go-aesctr-with-hmac"
	"github.com/gin-gonic/gin"
	"github.com/gtank/cryptopasta"
	"github.com/oleiade/reflections"
	"github.com/pingcap/log"
	"go.uber.org/zap"

	"reflect"
	"time"
)

func GenerateCSVFromRaw(rawData []interface{}, fields []string, timeFields []string) (data [][]string) {
	timeFieldsMap := make(map[string]struct{})
	for _, f := range timeFields {
		timeFieldsMap[f] = struct{}{}
	}

	fieldsMap := make(map[string]string)
	t := reflect.TypeOf(rawData[0])
	fieldsNum := t.NumField()
	allFields := make([]string, fieldsNum)
	for i := 0; i < fieldsNum; i++ {
		field := t.Field(i)
		allFields[i] = strings.ToLower(field.Tag.Get("json"))
		fieldsMap[allFields[i]] = field.Name
	}
	if len(fields) == 1 && fields[0] == "*" {
		fields = allFields
	}

	data = [][]string{fields}
	timeLayout := "01-02 15:04:05"
	for _, overview := range rawData {
		row := []string{}
		for _, field := range fields {
			fieldName := fieldsMap[field]
			s, _ := reflections.GetField(overview, fieldName)
			var val string
			switch t := s.(type) {
			case int:
				if _, ok := timeFieldsMap[field]; ok {
					val = time.Unix(int64(t), 0).Format(timeLayout)
				} else {
					val = fmt.Sprintf("%d", t)
				}
			case uint:
				val = fmt.Sprintf("%d", t)
			case float64:
				val = fmt.Sprintf("%f", t)
			default:
				val = fmt.Sprintf("%s", t)
			}
			row = append(row, val)
		}
		data = append(data, row)
	}
	return
}

func ExportCSV(data [][]string, filename, tokenNamespace string) (token string, err error) {
	csvFile, err := ioutil.TempFile("", filename)
	if err != nil {
		return
	}
	defer csvFile.Close()

	// generate encryption key
	secretKey := *cryptopasta.NewEncryptionKey()

	pr, pw := io.Pipe()
	go func() {
		csvwriter := csv.NewWriter(pw)
		_ = csvwriter.WriteAll(data)
		pw.Close()
	}()
	err = aesctr.Encrypt(pr, csvFile, secretKey[0:16], secretKey[16:])
	if err != nil {
		return
	}

	// generate token by filepath and secretKey
	secretKeyStr := base64.StdEncoding.EncodeToString(secretKey[:])
	token, err = NewJWTString(tokenNamespace, secretKeyStr+" "+csvFile.Name())
	return
}

func DownloadByToken(token, tokenNamespace string, c *gin.Context) {
	tokenPlain, err := ParseJWTString(tokenNamespace, token)
	if err != nil {
		MakeInvalidRequestErrorFromError(c, err)
		return
	}
	arr := strings.Fields(tokenPlain)
	if len(arr) != 2 {
		MakeInvalidRequestErrorFromError(c, errors.New("invalid token"))
		return
	}
	secretKey, err := base64.StdEncoding.DecodeString(arr[0])
	if err != nil {
		MakeInvalidRequestErrorFromError(c, err)
		return
	}

	filePath := arr[1]
	fileInfo, err := os.Stat(filePath)
	if err != nil {
		_ = c.Error(err)
		return
	}
	f, err := os.Open(filePath)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.Writer.Header().Set("Content-type", "text/csv")
	c.Writer.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileInfo.Name()))
	err = aesctr.Decrypt(f, c.Writer, secretKey[0:16], secretKey[16:])
	if err != nil {
		log.Error("decrypt csv failed", zap.Error(err))
	}
	// delete it anyway
	f.Close()
	_ = os.Remove(filePath)
}
