package logsearch

import (
	"archive/zip"
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
	"github.com/pingcap/sysutil"
	"google.golang.org/grpc"
	"io"
	"os"
	"path"
	"sync"
	"time"
)

type ReqInfo struct {
	ServerType string                          `json:"server_type"`
	IP         string                          `json:"ip"`
	Port       string                          `json:"port"`
	StatusPort string                          `json:"status_port"`
	Request    *diagnosticspb.SearchLogRequest `json:"request"`
}

func (r *ReqInfo) address() string {
	port := r.Port
	if r.ServerType == "tidb" {
		port = r.StatusPort
	}
	return fmt.Sprintf("%s:%s", r.IP, port)
}

func (r *ReqInfo) zipFilename() string {
	return fmt.Sprintf("%s-%s.zip", r.IP, r.Port)
}

func (r *ReqInfo) logFilename() string {
	return fmt.Sprintf("%s.log", r.ServerType)
}

type Task struct {
	*ReqInfo    `json:"request_info"`
	ID          string    `json:"id"`
	State       TaskState `json:"state"`
	SavedPath   string    `json:"saved_path"`
	TaskGroupID string    `json:"task_group_id"`
	Error       string    `json:"error"`
	CreateTime  int64     `json:"create_time"`
	StartTime   int64     `json:"start_time"`
	StopTime    int64     `json:"stop_time"`
	mu          sync.Mutex
	cancel      context.CancelFunc
	doneCh      chan struct{}
}

func (t *Task) Abort() error {
	if t.cancel != nil {
		t.doneCh = make(chan struct{})
		t.cancel()
		// ensure the task has been aborted
		<-t.doneCh
		return nil
	}
	return fmt.Errorf("task [%s] is not running", t.ID)
}

func NewTask(reqInfo *ReqInfo, taskGroupID string) *Task {
	return &Task{
		ReqInfo:     reqInfo,
		ID:          uuid.New().String(),
		TaskGroupID: taskGroupID,
		CreateTime:  time.Now().Unix(),
	}
}

func (t *Task) done() {
	if t.doneCh != nil {
		t.doneCh <- struct{}{}
	}
}

func (t *Task) close() {
	defer t.done()
	if t.Error != "" {
		fmt.Printf("task [%s] stoped, err=%s", t.ID, t.Error)
		t.clean()
		t.StopTime = time.Now().Unix()
		t.mu.Lock()
		t.State = StateCanceled
		db.ReplaceTask(t)
		t.mu.Unlock()
		return
	}
	t.StopTime = time.Now().Unix()
	t.mu.Lock()
	t.State = StateFinished
	db.ReplaceTask(t)
	t.mu.Unlock()
}

func (t *Task) clean() error {
	var err error
	if t.SavedPath != "" {
		err = os.RemoveAll(t.SavedPath)
		if err != nil {
			return err
		}
	}
	err = db.cleanPreview(t.ID)
	return err
}

const PreviewLogLinesLimit = 500

func (t *Task) run() {
	defer t.close()
	var ctx context.Context
	ctx, t.cancel = context.WithCancel(context.Background())
	opt := grpc.WithInsecure()

	conn, err := grpc.Dial(t.address(), opt)
	if err != nil {
		t.Error = err.Error()
		return
	}
	defer conn.Close()
	cli := diagnosticspb.NewDiagnosticsClient(conn)
	stream, err := cli.SearchLog(ctx, t.Request)
	if err != nil {
		t.Error = err.Error()
		return
	}

	dir := path.Join(logsSavePath, t.TaskGroupID)
	err = os.MkdirAll(dir, 0777)
	if err != nil {
		t.Error = err.Error()
		return
	}
	savedPath := path.Join(dir, t.zipFilename())
	f, err := os.Create(savedPath)
	if err != nil {
		t.Error = err.Error()
		return
	}
	defer f.Close()
	zw := zip.NewWriter(f)
	defer zw.Close()
	writer, err := zw.Create(t.logFilename())
	if err != nil {
		t.Error = err.Error()
		return
	}
	t.SavedPath = savedPath
	if err != nil {
		t.Error = err.Error()
		return
	}

	t.StartTime = time.Now().Unix()
	t.mu.Lock()
	t.State = StateRunning
	err = db.ReplaceTask(t)
	t.mu.Unlock()
	if err != nil {
		t.Error = err.Error()
		return
	}

	previewLogLinesCount := 0
	for {
		res, err := stream.Recv()
		if err != nil {
			if err != io.EOF {
				t.Error = err.Error()
			}
			return
		}
		for _, msg := range res.Messages {
			line := toLine(msg)
			// TODO: use unsafe here: string -> []byte
			_, err := writer.Write([]byte(line))
			if err != nil {
				t.Error = err.Error()
				return
			}
			if previewLogLinesCount < PreviewLogLinesLimit {
				err = db.insertLineToPreview(t.ID, msg)
				if err != nil {
					t.Error = err.Error()
					return
				}
				previewLogLinesCount++
			}
		}
		err = zw.Flush()
		if err != nil {
			t.Error = err.Error()
			return
		}
	}
}

func toLine(msg *diagnosticspb.LogMessage) string {
	timeStr := time.Unix(0, msg.Time*int64(time.Millisecond)).Format(sysutil.TimeStampLayout)
	return fmt.Sprintf("[%s] [%s] %s\n", timeStr, diagnosticspb.LogLevel_name[int32(msg.Level)], msg.Message)
}
