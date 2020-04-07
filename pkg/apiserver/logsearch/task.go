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

package logsearch

import (
	"archive/zip"
	"bufio"
	"context"
	"fmt"
	"io"
	"math"
	"os"
	"path"
	"strconv"
	"sync"
	"time"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"
	"github.com/pingcap/log"
	"github.com/pingcap/sysutil"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
)

// MaxRecvMsgSize set max gRPC receive message size received from server. If any message size is larger than
// current value, an error will be reported from gRPC.
var MaxRecvMsgSize = math.MaxInt64

type TaskGroup struct {
	service                *Service
	model                  *TaskGroupModel
	tasks                  []*Task
	tasksMu                sync.Mutex
	maxPreviewLinesPerTask int
}

func (tg *TaskGroup) InitTasks(taskModels []*TaskModel) {
	// Tasks are assigned after inserting into scheduler, thus it has a chance to run parallel with Abort.
	tg.tasksMu.Lock()
	defer tg.tasksMu.Unlock()

	if tg.tasks != nil {
		panic("LogSearchTaskGroup's task is already initialized")
	}
	tg.tasks = make([]*Task, 0, len(taskModels))
	for _, taskModel := range taskModels {
		ctx, cancel := context.WithCancel(context.Background())
		tg.tasks = append(tg.tasks, &Task{
			taskGroup: tg,
			model:     taskModel,
			ctx:       ctx,
			cancel:    cancel,
		})
	}
}

func (tg *TaskGroup) SyncRun() {
	log.Debug("LogSearchTaskGroup start", zap.Uint("task_group_id", tg.model.ID))

	// Create log directory
	dir := path.Join(tg.service.logStoreDirectory, strconv.Itoa(int(tg.model.ID)))
	if err := os.MkdirAll(dir, 0777); err == nil {
		tg.model.LogStoreDir = &dir
		tg.service.db.Save(tg.model)
	}

	wg := sync.WaitGroup{}
	for _, task := range tg.tasks {
		wg.Add(1)
		go func(task *Task) {
			task.SyncRun()
			wg.Done()
		}(task)
	}
	wg.Wait()

	log.Debug("LogSearchTaskGroup finished", zap.Uint("task_group_id", tg.model.ID))
	tg.model.State = TaskGroupStateFinished
	tg.service.db.Save(tg.model)
}

// This function is multi-thread safe.
func (tg *TaskGroup) AbortAll() {
	log.Debug("LogSearchTaskGroup abort", zap.Uint("task_group_id", tg.model.ID))

	tg.tasksMu.Lock()
	defer tg.tasksMu.Unlock()

	for _, task := range tg.tasks {
		task.Abort()
	}
}

type Task struct {
	taskGroup *TaskGroup
	model     *TaskModel
	ctx       context.Context
	cancel    context.CancelFunc
}

func (t *Task) String() string {
	return fmt.Sprintf("LogSearchTask { id = %d, target = %s, task_group_id = %d }", t.model.ID, t.model.SearchTarget, t.taskGroup.model.ID)
}

// This function is multi-thread safe.
func (t *Task) Abort() {
	log.Debug("LogSearchTask abort", zap.Any("task", t))

	if t.cancel != nil {
		t.cancel()
	}
}

func (t *Task) setError(err error) {
	errStr := err.Error()
	t.model.Error = &errStr
}

func (t *Task) SyncRun() {
	defer func() {
		if t.model.Error != nil {
			log.Warn("LogSearchTask stopped with error",
				zap.Any("task", t),
				zap.String("err", *t.model.Error),
			)
			t.model.RemoveDataAndPreview(t.taskGroup.service.db)
			t.model.State = TaskStateError
			t.taskGroup.service.db.Save(t.model)
			return
		}
		t.model.State = TaskStateFinished
		log.Debug("LogSearchTask finished", zap.Any("task", t))
		t.taskGroup.service.db.Save(t.model)
	}()

	log.Debug("LogSearchTask start", zap.Any("task", t))

	if t.taskGroup.model.LogStoreDir == nil {
		t.setError(fmt.Errorf("failed to create temporary directory"))
		return
	}

	secureOpt := grpc.WithInsecure()
	if t.taskGroup.service.config.ClusterTLSConfig != nil {
		creds := credentials.NewTLS(t.taskGroup.service.config.ClusterTLSConfig)
		secureOpt = grpc.WithTransportCredentials(creds)
	}

	conn, err := grpc.Dial(t.model.SearchTarget.GRPCAddress(),
		secureOpt,
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(MaxRecvMsgSize)),
	)
	if err != nil {
		t.setError(err)
		return
	}
	defer conn.Close()

	cli := diagnosticspb.NewDiagnosticsClient(conn)
	stream, err := cli.SearchLog(t.ctx, t.taskGroup.model.SearchRequest.ConvertToPB())
	if err != nil {
		t.setError(err)
		return
	}

	// Create zip file for the log in the log directory
	savedPath := path.Join(*t.taskGroup.model.LogStoreDir, t.model.SearchTarget.FileName()+".zip")
	f, err := os.Create(savedPath)
	if err != nil {
		t.setError(err)
		return
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	defer zw.Close()
	defer zw.Flush()

	writer, err := zw.Create(t.model.SearchTarget.FileName() + ".log")
	if err != nil {
		t.setError(err)
		return
	}

	bufWriter := bufio.NewWriterSize(writer, 16*1024*1024) // 16M buffer size
	defer bufWriter.Flush()

	t.model.LogStorePath = &savedPath
	t.model.State = TaskStateRunning

	previewLogLinesCount := 0
	for {
		res, err := stream.Recv()
		if err != nil {
			if err != io.EOF {
				t.setError(err)
			}
			return
		}
		for _, msg := range res.Messages {
			line := logMessageToString(msg)
			// TODO: use unsafe here: string -> []byte
			_, err := bufWriter.Write([]byte(line))
			if err != nil {
				t.setError(err)
				return
			}
			if previewLogLinesCount < t.taskGroup.maxPreviewLinesPerTask {
				t.taskGroup.service.db.Create(&PreviewModel{
					TaskID:      t.model.ID,
					TaskGroupID: t.taskGroup.model.ID,
					Time:        msg.Time,
					Level:       msg.Level,
					Message:     msg.Message,
				})
				previewLogLinesCount++
			}
		}
	}
}

func logMessageToString(msg *diagnosticspb.LogMessage) string {
	timeStr := time.Unix(0, msg.Time*int64(time.Millisecond)).Format(sysutil.TimeStampLayout)
	return fmt.Sprintf("[%s] [%s] %s\n", timeStr, msg.Level.String(), msg.Message)
}
