package logsearch

import (
	"database/sql/driver"
	"encoding/json"

	"github.com/jinzhu/gorm"
	_ "github.com/jinzhu/gorm/dialects/sqlite"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type TaskState string

const (
	StateRunning  TaskState = "running"
	StateCanceled           = "canceled"
	StateFinished           = "finished"
)

type SearchLogRequest diagnosticspb.SearchLogRequest

func (r *SearchLogRequest) Scan(src interface{}) error {
	return json.Unmarshal([]byte(src.(string)), r)
}

func (r *SearchLogRequest) Value() (driver.Value, error) {
	val, err := json.Marshal(r)
	return string(val), err
}

type Component struct {
	ServerType string `json:"server_type"`
	IP         string `json:"ip"`
	Port       string `json:"port"`
	StatusPort string `json:"status_port"`
}

type TaskModel struct {
	gorm.Model  `json:"-"`
	TaskID      string            `json:"task_id" gorm:"unique_index"`
	Component   *Component        `json:"component" gorm:"embedded"`
	Request     *SearchLogRequest `json:"request" gorm:"type:text"`
	State       TaskState         `json:"state"`
	SavedPath   string            `json:"saved_path"`
	TaskGroupID string            `json:"task_group_id"`
	Error       string            `json:"error"`
	CreateTime  int64             `json:"create_time"`
	StartTime   int64             `json:"start_time"`
	StopTime    int64             `json:"stop_time"`
}

type TaskGroupModel struct {
	gorm.Model  `json:"-"`
	TaskGroupID string
	Request     *SearchLogRequest `json:"request" gorm:"type:text"`
	state       TaskState
}

type PreviewModel struct {
	gorm.Model `json:"-"`
	TaskID     string
	Message    *diagnosticspb.LogMessage
}

type D struct {
	db *gorm.DB
}

var d D

func NewDB() *gorm.DB {
	db, err := gorm.Open("sqlite3", "test.db")
	if err != nil {
		panic(err)
	}
	return db
}

func (d *D) init() {
	d.db.AutoMigrate(&TaskModel{})
	d.db.AutoMigrate(&PreviewModel{})
}

func (d *D) createTask(task *TaskModel) error {
	return d.db.Create(task).Error
}

func (d *D) updateTask(task *TaskModel) error {
	return d.db.Save(task).Error
}

func (d *D) deleteTask(task *TaskModel) error {
	return d.db.Delete(task).Error
}

func (d *D) queryTaskByID(taskID string) (task TaskModel, err error) {
	err = d.db.First(&task, "task_id = ?", taskID).Error
	return
}

func (d *D) queryTasks(taskGroupID string) (tasks []TaskModel, err error) {
	err = d.db.Where("task_group_id = ?", taskGroupID).Find(tasks).Error
	return
}

func (d *D) queryAllTasks() (tasks []TaskModel, err error) {
	err = d.db.Find(&tasks).Error
	return
}

func (d *D) cleanAllUnfinishedTasks() error {
	return d.db.Where("state != ?", StateFinished).Delete(&TaskModel{}).Error
}

func (d *D) previewTask(taskID string) (previews []PreviewModel, err error) {
	err = d.db.Where("task_id = ?", taskID).Find(previews).Error
	return
}

func (d *D) newPreview(taskID string, msg *diagnosticspb.LogMessage) {
	preview := PreviewModel{
		TaskID:  taskID,
		Message: msg,
	}
	d.db.NewRecord(preview)
}

func (d *D) cleanPreview(taskID string) error {
	return d.db.Delete(PreviewModel{}, "task_id = ?", taskID).Error
}

func (d *D) cleanTask(taskID string) error {
	return d.db.Delete(TaskModel{}, "task_id = ?", taskID).Error
}
