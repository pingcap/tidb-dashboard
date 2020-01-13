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

package logs

import (
	"archive/zip"
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"time"

	"github.com/google/uuid"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
	"github.com/pingcap/sysutil"
	"google.golang.org/grpc"
)

type ReqInfo struct {
	serverType string
	ip         string
	port       string
	req        *diagnosticspb.SearchLogRequest
}

func (r *ReqInfo) address() string {
	return fmt.Sprintf("%s:%s", r.ip, r.port)
}

func (r *ReqInfo) zipFilename() string {
	return fmt.Sprintf("%s-%s.zip", r.ip, r.port)
}

func (r *ReqInfo) logFilename() string {
	return fmt.Sprintf("%s.log", r.serverType)
}

// TODO: use sync.Map here
type Tasks map[string]*Task

type Task struct {
	*ReqInfo
	db          *DBClient
	id          string
	taskGroupID string
	file        *os.File
	writer      io.Writer
	savedPath   string
	zw          *zip.Writer
	err         error
	cancel      context.CancelFunc
	needDeleted bool
}

func NewTask(reqInfo *ReqInfo, db *DBClient, taskGroupID string) *Task {
	return &Task{
		ReqInfo:     reqInfo,
		db:          db,
		id:          uuid.New().String(),
		taskGroupID: taskGroupID,
	}
}

func (t *Task) Abort() {
	t.cancel()
}

func (t *Task) close() {
	t.zw.Close()
	t.file.Close()

	if t.err != nil {
		fmt.Printf("task [%s] stoped, err=%s", t.id, t.err.Error())
		os.RemoveAll(t.savedPath)
		if t.needDeleted {
			t.db.cleanTaskByID(t.id)
			// TODO: notify client fetch task deleted
		} else {
			t.db.cancelTask(t.id)
			// TODO: notify client fetch task canceled
		}
		return
	}
	t.db.finishTask(t.id)
	// TODO: notify client fetch task finished
}

func (t *Task) CreateFile() error {
	dir := os.TempDir()
	dir = path.Join(dir, "dashboard-logs", t.taskGroupID)
	err := os.MkdirAll(dir, 0777)
	if err != nil {
		return err
	}
	savedPath := path.Join(dir, t.zipFilename())
	f, err := os.Create(savedPath)
	if err != nil {
		return err
	}
	zw := zip.NewWriter(f)
	writer, err := zw.Create(t.logFilename())
	if err != nil {
		return err
	}
	t.writer = writer
	t.file = f
	t.zw = zw
	t.savedPath = savedPath
	return nil
}

const PreviewLogLinesLimit = 100

func (t *Task) run(ctx context.Context) {
	defer t.close()
	opt := grpc.WithInsecure()

	conn, err := grpc.Dial(t.address(), opt)
	if err != nil {
		t.err = err
		return
	}
	defer conn.Close()
	cli := diagnosticspb.NewDiagnosticsClient(conn)
	ctx, t.cancel = context.WithCancel(ctx)
	stream, err := cli.SearchLog(ctx, t.req)
	if err != nil {
		t.err = err
		return
	}

	err = t.CreateFile()
	if err != nil {
		t.err = err
		return
	}
	err = t.db.startTask(t.id, t.savedPath, t.taskGroupID)
	if err != nil {
		t.err = err
		return
	}

	// TODO: notify client fetch tasks started
	previewLogLinesCount := 0
	for {
		res, err := stream.Recv()
		if err != nil {
			if err != io.EOF {
				t.err = err
			}
			return
		}
		for _, msg := range res.Messages {
			line := toLine(msg)
			// TODO: use unsafe here: string -> []byte
			_, err := t.writer.Write([]byte(line))
			if err != nil {
				t.err = err
				return
			}
			if previewLogLinesCount < PreviewLogLinesLimit {
				err = t.db.insertLineToPreview(t.id, msg)
				if err != nil {
					t.err = err
					return
				}
				previewLogLinesCount++
			}
		}
		err = t.zw.Flush()
		if err != nil {
			t.err = err
			return
		}
	}
}

func toLine(msg *diagnosticspb.LogMessage) string {
	timeStr := time.Unix(0, msg.Time*int64(time.Millisecond)).Format(sysutil.TimeStampLayout)
	return fmt.Sprintf("[%s] [%s] %s\n", timeStr, diagnosticspb.LogLevel_name[int32(msg.Level)], msg.Message)
}
