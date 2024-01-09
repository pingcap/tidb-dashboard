// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/joomcode/errorx"

	"github.com/pingcap/tidb-dashboard/pkg/apiserver/model"
	"github.com/pingcap/tidb-dashboard/pkg/dbstore"
)

// TaskState is used to represent the task/task group state.
type TaskState int

// Built-in task state.
const (
	TaskStateError TaskState = iota
	TaskStateRunning
	TaskStateFinish
	TaskStatePartialFinish // Only valid for task group
	TaskStateSkipped
)

type TaskRawDataType string

const (
	RawDataTypeJeprof   TaskRawDataType = "jeprof"
	RawDataTypeProtobuf TaskRawDataType = "protobuf"
	RawDataTypeText     TaskRawDataType = "text"
)

type (
	TaskProfilingType     string
	TaskProfilingTypeList []TaskProfilingType
)

func (r *TaskProfilingTypeList) Scan(src interface{}) error {
	return json.Unmarshal([]byte(src.(string)), r)
}

func (r TaskProfilingTypeList) Value() (driver.Value, error) {
	val, err := json.Marshal(r)
	return string(val), err
}

const (
	ProfilingTypeCPU       TaskProfilingType = "cpu"
	ProfilingTypeHeap      TaskProfilingType = "heap"
	ProfilingTypeGoroutine TaskProfilingType = "goroutine"
	ProfilingTypeMutex     TaskProfilingType = "mutex"
)

var profilingTypeMap = map[TaskProfilingType]struct{}{
	ProfilingTypeCPU:       {},
	ProfilingTypeHeap:      {},
	ProfilingTypeGoroutine: {},
	ProfilingTypeMutex:     {},
}

type TaskModel struct {
	ID            uint                    `json:"id" gorm:"primary_key"`
	TaskGroupID   uint                    `json:"task_group_id" gorm:"index"`
	State         TaskState               `json:"state" gorm:"index"`
	Target        model.RequestTargetNode `json:"target" gorm:"embedded;embedded_prefix:target_"`
	FilePath      string                  `json:"-" gorm:"type:text"`
	Error         string                  `json:"error" gorm:"type:text"`
	StartedAt     int64                   `json:"started_at"` // The start running time, reset when retry. Used to estimate approximate profiling progress.
	RawDataType   TaskRawDataType         `json:"raw_data_type" gorm:"raw_data_type"`
	ProfilingType TaskProfilingType       `json:"profiling_type"`
}

func (TaskModel) TableName() string {
	return "profiling_tasks"
}

type TaskGroupModel struct {
	ID                     uint                          `json:"id" gorm:"primary_key"`
	State                  TaskState                     `json:"state" gorm:"index"`
	ProfileDurationSecs    uint                          `json:"profile_duration_secs"`
	TargetStats            model.RequestTargetStatistics `json:"target_stats" gorm:"embedded;embedded_prefix:target_stats_"`
	StartedAt              int64                         `json:"started_at"`
	RequstedProfilingTypes TaskProfilingTypeList         `json:"requsted_profiling_types"`
}

func (TaskGroupModel) TableName() string {
	return "profiling_task_groups"
}

func autoMigrate(db *dbstore.DB) error {
	return db.AutoMigrate(&TaskModel{}, &TaskGroupModel{})
}

// Task is the unit to fetch profiling information.
type Task struct {
	*TaskModel
	ctx       context.Context
	cancel    context.CancelFunc
	taskGroup *TaskGroup
	fetchers  *fetchers
}

// NewTask creates a new profiling task.
func NewTask(ctx context.Context, taskGroup *TaskGroup, target model.RequestTargetNode, fts *fetchers, profilingType TaskProfilingType) *Task {
	ctx, cancel := context.WithCancel(ctx)
	return &Task{
		TaskModel: &TaskModel{
			TaskGroupID:   taskGroup.ID,
			State:         TaskStateRunning,
			Target:        target,
			StartedAt:     time.Now().Unix(),
			ProfilingType: profilingType,
		},
		ctx:       ctx,
		cancel:    cancel,
		taskGroup: taskGroup,
		fetchers:  fts,
	}
}

func (t *Task) run() {
	fileNameWithoutExt := fmt.Sprintf("%s_%s", t.ProfilingType, t.Target.FileName())
	protoFilePath, rawDataType, err := profileAndWritePprof(t.ctx, t.fetchers, &t.Target, fileNameWithoutExt, t.taskGroup.ProfileDurationSecs, t.ProfilingType)
	if err != nil {
		if errorx.IsOfType(err, ErrUnsupportedProfilingType) {
			t.State = TaskStateSkipped
		} else {
			t.Error = err.Error()
			t.State = TaskStateError
		}
		t.taskGroup.db.Save(t.TaskModel)
		return
	}
	t.FilePath = protoFilePath
	t.State = TaskStateFinish
	t.RawDataType = rawDataType
	t.taskGroup.db.Save(t.TaskModel)
}

func (t *Task) stop() {
	t.cancel()
}

// TaskGroup is the collection of tasks.
type TaskGroup struct {
	*TaskGroupModel
	db *dbstore.DB
}

// NewTaskGroup create a new profiling task group.
func NewTaskGroup(db *dbstore.DB, profileDurationSecs uint, stats model.RequestTargetStatistics, requestedProfilingTypes TaskProfilingTypeList) *TaskGroup {
	return &TaskGroup{
		TaskGroupModel: &TaskGroupModel{
			State:                  TaskStateRunning,
			ProfileDurationSecs:    profileDurationSecs,
			TargetStats:            stats,
			StartedAt:              time.Now().Unix(),
			RequstedProfilingTypes: requestedProfilingTypes,
		},
		db: db,
	}
}
