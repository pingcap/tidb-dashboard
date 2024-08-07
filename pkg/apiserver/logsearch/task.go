// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package logsearch

import (
	"archive/zip"
	"bufio"
	"context"
	"fmt"
	"io"
	"math"
	"net"
	"os"
	"path"
	"path/filepath"
	"strconv"
	"sync"
	"time"
	"unsafe"

	"github.com/pingcap/kvproto/pkg/diagnosticspb"
	"github.com/pingcap/log"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
)

// MaxRecvMsgSize set max gRPC receive message size received from server. If any message size is larger than
// current value, an error will be reported from gRPC.
var MaxRecvMsgSize = math.MaxInt64 - 1

type TaskGroup struct {
	service                *Service
	model                  *TaskGroupModel
	tasks                  []*Task
	tasksMu                sync.Mutex
	maxPreviewLinesPerTask int
}

func (tg *TaskGroup) InitTasks(ctx context.Context, taskModels []*TaskModel) {
	// Tasks are assigned after inserting into scheduler, thus it has a chance to run parallel with Abort.
	tg.tasksMu.Lock()
	defer tg.tasksMu.Unlock()

	if tg.tasks != nil {
		panic("LogSearchTaskGroup's task is already initialized")
	}
	tg.tasks = make([]*Task, 0, len(taskModels))
	for _, taskModel := range taskModels {
		ctx, cancel := context.WithCancel(ctx)
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
	err := os.MkdirAll(dir, 0o777) // #nosec
	if err == nil {
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
	return fmt.Sprintf("LogSearchTask { id = %d, target = %s, task_group_id = %d }", t.model.ID, t.model.Target, t.taskGroup.model.ID)
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

func (t *Task) accumulateLogSize(path *string) {
	if path != nil {
		stat, err := os.Stat(*path)
		if err != nil {
			log.Warn("Can NOT fetch log file size for LogSearchTask",
				zap.String("dir", *path),
				zap.Any("task", t),
				zap.String("err", err.Error()),
			)
		} else {
			t.model.Size += stat.Size()
		}
	}
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
		t.accumulateLogSize(t.model.LogStorePath)
		t.accumulateLogSize(t.model.SlowLogStorePath)
		log.Debug("LogSearchTask finished", zap.Any("task", t))
		t.taskGroup.service.db.Save(t.model)
	}()

	log.Debug("LogSearchTask start", zap.Any("task", t))

	if t.taskGroup.model.LogStoreDir == nil {
		t.setError(fmt.Errorf("failed to create temporary directory"))
		return
	}

	secureOpt := grpc.WithTransportCredentials(insecure.NewCredentials())
	if t.taskGroup.service.config.ClusterTLSConfig != nil {
		creds := credentials.NewTLS(t.taskGroup.service.config.ClusterTLSConfig)
		secureOpt = grpc.WithTransportCredentials(creds)
	}

	conn, err := grpc.Dial(net.JoinHostPort(t.model.Target.IP, strconv.Itoa(t.model.Target.Port)),
		secureOpt,
		grpc.WithDefaultCallOptions(grpc.MaxCallRecvMsgSize(MaxRecvMsgSize)),
	)
	if err != nil {
		t.setError(err)
		return
	}
	defer conn.Close()

	cli := diagnosticspb.NewDiagnosticsClient(conn)
	t.searchLog(cli, diagnosticspb.SearchLogRequest_Normal)
	// Only TiKV support searching slow log now
	if t.model.Target.Kind == model.NodeKindTiKV {
		t.searchLog(cli, diagnosticspb.SearchLogRequest_Slow)
	}
}

func (t *Task) searchLog(client diagnosticspb.DiagnosticsClient, targetType diagnosticspb.SearchLogRequest_Target) {
	if t.model.Error != nil {
		return
	}
	req := t.taskGroup.model.SearchRequest.ConvertToPB(targetType)
	patterns := make([]string, len(req.Patterns))
	for i, p := range req.Patterns {
		patterns[i] = "(?i)" + p
	}
	req.Patterns = patterns
	stream, err := client.SearchLog(t.ctx, req)
	if err != nil {
		t.setError(err)
		return
	}

	// Create zip file for the log in the log directory
	fileName := t.model.Target.FileName()
	if targetType == diagnosticspb.SearchLogRequest_Slow {
		fileName = fileName + "-slow"
	}
	savedPath := path.Join(*t.taskGroup.model.LogStoreDir, fileName+".zip")
	f, err := os.Create(filepath.Clean(savedPath))
	if err != nil {
		t.setError(err)
		return
	}
	defer f.Close() // #nosec

	// TODO: Could we use a memory buffer for this and flush the writer regularly to avoid OOM.
	// This might perform an faster processing. This could also avoid creating an empty .zip
	// firstly even if the searching result is empty.
	zw := zip.NewWriter(f)
	defer zw.Close()
	defer zw.Flush()

	writer, err := zw.Create(fileName + ".log")
	if err != nil {
		t.setError(err)
		return
	}

	bufWriter := bufio.NewWriterSize(writer, 16*1024*1024) // 16M buffer size
	defer bufWriter.Flush()

	t.model.State = TaskStateRunning
	previewLogLinesCount := 0
	for {
		res, err := stream.Recv()
		if err != nil {
			if err != io.EOF {
				t.setError(err)
			}
			if previewLogLinesCount != 0 {
				if targetType == diagnosticspb.SearchLogRequest_Normal {
					t.model.LogStorePath = &savedPath
				} else {
					t.model.SlowLogStorePath = &savedPath
				}
			}
			return
		}
		for _, msg := range res.Messages {
			line := logMessageToString(msg)
			_, err := bufWriter.Write(*(*[]byte)(unsafe.Pointer(&line))) // #nosec
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
	timeStr := time.Unix(0, msg.Time*int64(time.Millisecond)).Format("2006/01/02 15:04:05.000 -07:00")
	return fmt.Sprintf("[%s] [%s] %s\n", timeStr, msg.Level.String(), msg.Message)
}
