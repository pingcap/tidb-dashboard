package logsearch

import (
	"archive/tar"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
	"github.com/pingcap/kvproto/pkg/diagnosticspb"
)

type Service struct {
	config *config.Config
}

var logsSavePath string

func NewService(config *config.Config) *Service {
	logsSavePath = path.Join(config.DataDir, "logs")
	os.MkdirAll(logsSavePath, 0777)
	sqlDB, err := sql.Open("sqlite3", path.Join(config.DataDir, "dashboard.sqlite.db"))
	if err != nil {
		panic(err)
	}
	db = NewDBClient(sqlDB)
	err = db.init()
	if err != nil {
		panic(err)
	}
	scheduler = NewScheduler()
	err = scheduler.loadTasksFromDB()
	if err != nil {
		panic(err)
	}
	return &Service{config: config}
}

func (s *Service) Register(r *gin.RouterGroup) {
	endpoint := r.Group("/logs")

	endpoint.GET("/tasks", s.TaskGetList)
	endpoint.GET("/tasks/preview/:id", s.TaskPreview)
	endpoint.GET("/tasks/preview", s.MultipleTaskPreview)
	endpoint.POST("/tasks", s.TaskGroupCreate)
	endpoint.POST("/tasks/run/:id", s.TaskRun)
	endpoint.GET("/tasks/download/:id", s.TaskDownload)
	endpoint.GET("/download", s.MultipleTaskDownload)
	endpoint.POST("/tasks/cancel/:id", s.TaskCancel)
	endpoint.DELETE("/tasks/:id", s.TaskDelete)
}

func (s *Service) TaskGetList(c *gin.Context) {
	tasks, err := db.queryAllTasks()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg":  "success",
		"data": tasks,
	})
}

func (s *Service) TaskPreview(c *gin.Context) {
	taskID := c.Param("id")
	lines, err := db.previewTask(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg":  "success",
		"data": lines,
	})
}

type LogPreview struct {
	task    *Task
	preview []*diagnosticspb.LogMessage
}

type LinePreview struct {
	TaskID     string                    `json:"task_id"`
	ServerType string                    `json:"server_type"`
	Address    string                    `json:"address"`
	Message    *diagnosticspb.LogMessage `json:"message"`
}

func (s *Service) MultipleTaskPreview(c *gin.Context) {
	ids := c.QueryArray("id")
	previews, err := getPreviews(ids)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	res := mergeLines(previews)
	c.JSON(http.StatusOK, gin.H{
		"msg":  "success",
		"data": res,
	})
}

func getPreviews(ids []string) ([]*LogPreview, error) {
	previews := make([]*LogPreview, 0, len(ids))
	for _, taskID := range ids {
		task, err := db.queryTaskByID(taskID)
		if err != nil {
			return nil, err
		}
		lines, err := db.previewTask(taskID)
		if err != nil {
			return nil, err
		}
		previews = append(previews, &LogPreview{
			task,
			lines,
		})
	}
	return previews, nil
}

func (s *Service) TaskGroupCreate(c *gin.Context) {
	// TODO: using parameters provided by client
	endTime := time.Now().UnixNano() / int64(time.Millisecond)
	startTime := int64(0)
	var searchLogReq = &diagnosticspb.SearchLogRequest{
		StartTime: startTime,
		EndTime:   endTime,
		Levels:    nil,
		Patterns:  nil,
	}
	var args = []*ReqInfo{
		{
			ServerType: "tidb",
			IP:         "127.0.0.1",
			Port:       "4000",
			StatusPort: "10080",
			Request:    searchLogReq,
		},
		{
			ServerType: "tikv",
			IP:         "127.0.0.1",
			Port:       "20160",
			StatusPort: "20160",
			Request:    searchLogReq,
		},
		{
			ServerType: "pd",
			IP:         "127.0.0.1",
			Port:       "2379",
			StatusPort: "2379",
			Request:    searchLogReq,
		},
	}
	taskGroupID := scheduler.addTasks(args)
	err := scheduler.runTaskGroup(taskGroupID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

func (s *Service) TaskRun(c *gin.Context) {
	taskID := c.Param("id")
	task, err := db.queryTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	err = scheduler.deleteTask(task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
	scheduler.storeTask(task)
	go task.run()
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

func (s *Service) TaskDownload(c *gin.Context) {
	taskID := c.Param("id")
	task, err := db.queryTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	f, err := os.Open(task.SavedPath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
	_, err = io.Copy(c.Writer, f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
}

func (s *Service) MultipleTaskDownload(c *gin.Context) {
	ids := c.QueryArray("id")
	tasks := make([]*Task, 0, len(ids))
	for _, taskID := range ids {
		task, err := db.queryTaskByID(taskID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"msg": err.Error(),
			})
			return
		}
		tasks = append(tasks, task)
	}
	err := dumpLogs(tasks, c.Writer)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
}

func dumpLogs(tasks []*Task, w http.ResponseWriter) error {
	tw := tar.NewWriter(w)
	defer tw.Close()
	for _, task := range tasks {
		err := dumpLog(task.SavedPath, tw)
		if err != nil {
			return err
		}
	}
	return nil
}

func dumpLog(savedPath string, tw *tar.Writer) error {
	f, err := os.Open(savedPath)
	if err != nil {
		return err
	}
	defer f.Close()
	fi, err := f.Stat()
	if err != nil {
		return err
	}
	err = tw.WriteHeader(&tar.Header{
		Name:    path.Base(savedPath),
		Mode:    int64(fi.Mode()),
		ModTime: fi.ModTime(),
		Size:    fi.Size(),
	})
	if err != nil {
		return err
	}

	_, err = io.Copy(tw, f)
	if err != nil {
		return err
	}
	return nil
}

func (s *Service) TaskCancel(c *gin.Context) {
	taskID := c.Param("id")
	task, err := db.queryTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	if task.State != StateRunning {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": fmt.Sprintf("task [%s] has been %s", taskID, task.State),
		})
		return
	}
	err = scheduler.abortTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}

func (s *Service) TaskDelete(c *gin.Context) {
	taskID := c.Param("id")
	task, err := db.queryTaskByID(taskID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"msg": err.Error(),
		})
		return
	}
	err = scheduler.deleteTask(task)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"msg": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"msg": "success",
	})
}
