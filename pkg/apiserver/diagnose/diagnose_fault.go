package diagnose

import (
	"fmt"
)

func (c *clusterInspection) diagnoseFault() (*inspectionResult, error) {
	// TiKV server down down
	return nil, nil
}

func (c *clusterInspection) diagnoseServerDown() (*inspectionResult, error) {
	condition := fmt.Sprintf("where time >= '%s' and time < '%s' ", c.startTime, c.endTime)
	prepareSQL := "set @@tidb_metric_query_step=30;set @@tidb_metric_query_range_duration=30;"
	sql := fmt.Sprintf(`select t1.job,t1.instance, t2.min_time from
(select instance,job from metrics_schema.up %[1]s group by instance,job having max(value)-min(value)>0) as t1 join
(select instance,min(time) as min_time from metrics_schema.up %[1]s and value=0 group by instance,job) as t2 on t1.instance=t2.instance;`, condition)
	rows, err := querySQL(c.db, prepareSQL+sql)
	if err != nil {
		return nil, err
	}
	detail := ""
	for i, row := range rows {
		if len(row) < 3 {
			continue
		}
		if i > 0 {
			detail += ",\n"
		}
		info := fmt.Sprintf("%s %s disconnect with prometheus around time '%s'", row[0], row[1], row[2])
		detail += info
	}
	fmt.Println(detail)
	fmt.Println()
	return nil, err
}
