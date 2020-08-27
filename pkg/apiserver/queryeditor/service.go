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

package queryeditor

import (
	"archive/zip"
	"bufio"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap/log"
	"go.uber.org/fx"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/user"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/apiserver/utils"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/tidb"
)

const MaxExecutionTime = time.Minute * 5

type ServiceParams struct {
	fx.In
	Config     *config.Config
	TiDBClient *tidb.Client
}

type Service struct {
	params       ServiceParams
	lifecycleCtx context.Context
}

func NewService(lc fx.Lifecycle, p ServiceParams) *Service {
	service := &Service{params: p}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			service.lifecycleCtx = ctx
			return nil
		},
	})

	return service
}

func Register(r *gin.RouterGroup, auth *user.AuthService, s *Service) {
	endpoint := r.Group("/query_editor")
	endpoint.GET("/download", s.fileDownloadHandler)
	endpoint.Use(auth.MWAuthRequired())
	endpoint.Use(utils.MWConnectTiDB(s.params.TiDBClient))
	endpoint.Use(utils.MWForbidByExperimentalFlag(s.params.Config.EnableExperimental))
	endpoint.POST("/run", s.runHandler)
	endpoint.POST("/bulk_export_csv", s.bulkExportCSVHandler)
}

type RunRequest struct {
	Statements string `json:"statements" example:"show databases;"`
	MaxRows    int    `json:"max_rows" example:"1000"`
}

type RunResponse struct {
	ErrorMsg    string          `json:"error_msg"`
	ColumnNames []string        `json:"column_names"`
	Rows        [][]interface{} `json:"rows"`
	ExecutionMs int64           `json:"execution_ms"`
	ActualRows  int             `json:"actual_rows"`
}

type RowProcessor func([]interface{}) error

func executeStatements(context context.Context, db *sql.DB, statements string, rowProc RowProcessor) ([]string, error) {
	rows, err := db.QueryContext(context, statements)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	colNames, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	values := make([]sql.RawBytes, len(colNames))
	scanArgs := make([]interface{}, len(values))
	for i := range values {
		scanArgs[i] = &values[i]
	}

	for rows.Next() {
		err = rows.Scan(scanArgs...)
		if err != nil {
			return nil, err
		}

		retRow := make([]interface{}, 0, len(values))
		var value interface{}
		for _, col := range values {
			if col == nil {
				value = nil
			} else {
				value = string(col)
			}
			retRow = append(retRow, value)
		}
		if err := rowProc(retRow); err != nil {
			return nil, err
		}
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}

	return colNames, nil
}

func executeAndExportStatements(context context.Context, db *sql.DB, statements string) (string, error) {
	tmpFile, err := ioutil.TempFile(os.TempDir(), "dashboard-export-")
	if err != nil {
		return "", err
	}

	w := bufio.NewWriter(tmpFile)

	cleanUp := func() {
		_ = w.Flush()
		_ = tmpFile.Close()
		_ = os.Remove(tmpFile.Name())
	}

	_, err = executeStatements(context, db, statements, func(row []interface{}) error {
		for n, datum := range row {
			if n > 0 {
				if err := w.WriteByte(','); err != nil {
					return err
				}
			}
			if datum == nil {
				if _, err := w.WriteString("\\N"); err != nil {
					return err
				}
			} else {
				if err := w.WriteByte('"'); err != nil {
					return err
				}
				field := datum.(string)
				for len(field) > 0 {
					i := strings.IndexAny(field, "\x00\b\n\r\t\x1a\"\\")
					if i < 0 {
						i = len(field)
					}
					if _, err := w.WriteString(field[:i]); err != nil {
						return err
					}
					field = field[i:]
					if len(field) > 0 {
						var err error
						switch field[0] {
						case '\x00':
							_, err = w.WriteString("\\0")
						case '\b':
							_, err = w.WriteString("\\b")
						case '\n':
							_, err = w.WriteString("\\n")
						case '\r':
							_, err = w.WriteString("\\r")
						case '\t':
							_, err = w.WriteString("\\t")
						case '\x1a':
							_, err = w.WriteString("\\Z")
						case '"':
							_, err = w.WriteString("\\\"")
						case '\\':
							_, err = w.WriteString("\\\\")
						}
						field = field[1:]
						if err != nil {
							return err
						}
					}
				}
				if err := w.WriteByte('"'); err != nil {
					return err
				}
			}
		}
		err := w.WriteByte('\n')
		return err
	})

	if err == nil {
		err = w.Flush()
	}
	if err == nil {
		err = tmpFile.Close()
	}
	if err != nil {
		cleanUp()
		return "", err
	}

	return tmpFile.Name(), nil
}

// @ID queryEditorRun
// @Summary Run statements
// @Param request body RunRequest true "Request body"
// @Success 200 {object} RunResponse
// @Router /query_editor/run [post]
// @Security JwtAuth
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 403 {object} utils.APIError "Experimental feature not enabled"
func (s *Service) runHandler(c *gin.Context) {
	var req RunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	ctx, cancel := context.WithTimeout(s.lifecycleCtx, MaxExecutionTime)
	defer cancel()

	startTime := time.Now()
	rows := make([][]interface{}, 0)
	colNames, err := executeStatements(ctx, utils.GetTiDBConnection(c).DB(), req.Statements, func(row []interface{}) error {
		rows = append(rows, row)
		return nil
	})
	elapsedTime := time.Since(startTime)

	if err != nil {
		log.Warn("Failed to execute user input statements", zap.String("statements", req.Statements), zap.Error(err))
		c.JSON(http.StatusOK, RunResponse{
			ErrorMsg:    err.Error(),
			ColumnNames: nil,
			Rows:        nil,
			ExecutionMs: elapsedTime.Milliseconds(),
			ActualRows:  0,
		})
		return
	}

	truncatedRows := rows
	if len(truncatedRows) > req.MaxRows {
		truncatedRows = truncatedRows[:req.MaxRows]
	}

	c.JSON(http.StatusOK, RunResponse{
		ColumnNames: colNames,
		Rows:        truncatedRows,
		ExecutionMs: elapsedTime.Milliseconds(),
		ActualRows:  len(rows),
	})
}

func escapeId(s string) string {
	return "`" + strings.ReplaceAll(s, "`", "``") + "`"
}

type BulkExportItem struct {
	tableName string
	file      string
}

func writeFileToZip(filePath string, fileName string, zipWriter *zip.Writer) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}

	defer file.Close()

	info, err := file.Stat()
	if err != nil {
		return err
	}
	header, err := zip.FileInfoHeader(info)
	if err != nil {
		return err
	}
	header.Name = fileName
	writer, err := zipWriter.CreateHeader(header)
	if err != nil {
		return err
	}
	_, err = io.Copy(writer, file)
	return err
}

func packBulkExportItems(items []BulkExportItem) (string, error) {
	defer func() {
		for _, item := range items {
			_ = os.Remove(item.file)
		}
	}()

	tmpFile, err := ioutil.TempFile(os.TempDir(), "dashboard-export-packed-")
	if err != nil {
		return "", err
	}
	defer tmpFile.Close()

	zipWriter := zip.NewWriter(tmpFile)
	defer zipWriter.Close()

	for _, item := range items {
		err := writeFileToZip(item.file, fmt.Sprintf("%s.csv", item.tableName), zipWriter)
		if err != nil {
			tmpFile.Close()
			_ = os.Remove(tmpFile.Name())
			return "", err
		}
	}

	return tmpFile.Name(), nil
}

type BulkExportCSVRequest struct {
	Db     string   `json:"db"`
	Tables []string `json:"tables"`
}

type FileTokenResponse struct {
	FileToken string `json:"file_token"`
}

type FileTokenContent struct {
	SourceFile string `json:"source_file"`
	Name       string `json:"name"`
}

func respondFileToken(c *gin.Context, filePath string, downloadName string) {
	// When there is only one file, return csv directly.
	body, err := json.Marshal(&FileTokenContent{
		SourceFile: filePath,
		Name:       downloadName,
	})
	if err != nil {
		_ = c.Error(err)
		return
	}
	token, err := utils.NewJWTString("queryEditor/download", string(body))
	if err != nil {
		_ = c.Error(err)
		return
	}
	c.JSON(http.StatusOK, FileTokenResponse{
		FileToken: token,
	})
}

// @ID queryEditorBulkExport
// @Summary Bulk export tables in MySQL CSV format
// @Param request body BulkExportCSVRequest true "Request body"
// @Success 200 {object} FileTokenResponse
// @Router /query_editor/bulk_export_csv [post]
// @Security JwtAuth
// @Failure 400 {object} utils.APIError "Bad request"
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Failure 403 {object} utils.APIError "Experimental feature not enabled"
func (s *Service) bulkExportCSVHandler(c *gin.Context) {
	var req BulkExportCSVRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}
	if len(req.Tables) == 0 {
		utils.MakeInvalidRequestErrorWithMessage(c, "Expect at least one table to export")
		return
	}

	items := make([]BulkExportItem, 0)

	var err0 error

	for _, tableName := range req.Tables {
		ctx, cancel := context.WithTimeout(s.lifecycleCtx, MaxExecutionTime)
		tmpFile, err := executeAndExportStatements(ctx,
			utils.GetTiDBConnection(c).DB(),
			fmt.Sprintf(`SELECT * FROM %s.%s`, escapeId(req.Db), escapeId(tableName)))
		if err != nil && err0 == nil {
			err0 = err
		}
		if err == nil {
			items = append(items, BulkExportItem{
				tableName: tableName,
				file:      tmpFile,
			})
		} else {
			log.Warn("Export failed", zap.String("db", req.Db), zap.String("table", tableName), zap.Error(err))
		}
		cancel()
	}

	if len(items) == 0 && err0 != nil {
		_ = c.Error(err0)
		return
	}

	if len(items) == 1 {
		// If there is only one file, return CSV directly
		respondFileToken(c, items[0].file, items[0].tableName+".csv")
		return
	}

	zipFile, err := packBulkExportItems(items)
	if err != nil {
		_ = c.Error(err)
		return
	}

	respondFileToken(c, zipFile, req.Db+".csv.zip")
}

// @Summary Download exported files
// @Produce application/zip,text/csv
// @Param token query string true "download token"
// @Failure 400 {object} utils.APIError
// @Failure 401 {object} utils.APIError "Unauthorized failure"
// @Router /query_editor/download [get]
func (s *Service) fileDownloadHandler(c *gin.Context) {
	token := c.Query("token")
	str, err := utils.ParseJWTString("queryEditor/download", token)
	if err != nil {
		utils.MakeInvalidRequestErrorFromError(c, err)
		return
	}

	var body FileTokenContent
	err = json.Unmarshal([]byte(str), &body)
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.FileAttachment(body.SourceFile, body.Name)
	_ = os.Remove(body.SourceFile)
}
