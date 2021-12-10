// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package profiling

import (
	"context"
	"fmt"
	"time"

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
	TaskPartialFinish
)

type TaskProfilingRawDataType string

const ProfilingRawDataTypeProtobuf TaskProfilingRawDataType = "protobuf"

type TaskModel struct {
	ID                   uint                     `json:"id" gorm:"primary_key"`
	TaskGroupID          uint                     `json:"task_group_id" gorm:"index"`
	State                TaskState                `json:"state" gorm:"index"`
	Target               model.RequestTargetNode  `json:"target" gorm:"embedded;embedded_prefix:target_"`
	FilePath             string                   `json:"-" gorm:"type:text"`
	Error                string                   `json:"error" gorm:"type:text"`
	StartedAt            int64                    `json:"started_at"` // The start running time, reset when retry. Used to estimate approximate profiling progress.
	ProfilingRawDataType TaskProfilingRawDataType `json:"profile_raw_data_type"`
}

func (TaskModel) TableName() string {
	return "profiling_tasks"
}

type TaskGroupModel struct {
	ID                  uint                          `json:"id" gorm:"primary_key"`
	State               TaskState                     `json:"state" gorm:"index"`
	ProfileDurationSecs uint                          `json:"profile_duration_secs"`
	TargetStats         model.RequestTargetStatistics `json:"target_stats" gorm:"embedded;embedded_prefix:target_stats_"`
	StartedAt           int64                         `json:"started_at"`
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
func NewTask(ctx context.Context, taskGroup *TaskGroup, target model.RequestTargetNode, fts *fetchers) *Task {
	ctx, cancel := context.WithCancel(ctx)
	return &Task{
		TaskModel: &TaskModel{
			TaskGroupID: taskGroup.ID,
			State:       TaskStateRunning,
			Target:      target,
			StartedAt:   time.Now().Unix(),
		},
		ctx:       ctx,
		cancel:    cancel,
		taskGroup: taskGroup,
		fetchers:  fts,
	}
}

func (t *Task) run() {
	fileNameWithoutExt := fmt.Sprintf("profiling_%d_%d_%s", t.TaskGroupID, t.ID, t.Target.FileName())
	protoFilePath, ProfilingRawDataType, err := profileAndWritePprof(t.ctx, t.fetchers, &t.Target, fileNameWithoutExt, t.taskGroup.ProfileDurationSecs)
	if err != nil {
		t.Error = err.Error()
		t.State = TaskStateError
		t.taskGroup.db.Save(t.TaskModel)
		return
	}
	t.FilePath = protoFilePath
	t.State = TaskStateFinish
	t.ProfilingRawDataType = ProfilingRawDataType
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
func NewTaskGroup(db *dbstore.DB, profileDurationSecs uint, stats model.RequestTargetStatistics) *TaskGroup {
	return &TaskGroup{
		TaskGroupModel: &TaskGroupModel{
			State:               TaskStateRunning,
			ProfileDurationSecs: profileDurationSecs,
			TargetStats:         stats,
			StartedAt:           time.Now().Unix(),
		},
		db: db,
	}
}
