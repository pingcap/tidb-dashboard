package clusterinfo

import (
	"encoding/json"
	"fmt"
)

type TiDB struct {
	Common
	StatusPort string `json:"status_port"`
}

func (t *TiDB) UnmarshalJSON(d []byte) error {
	x := struct {
		Common
		StatusPort uint `json:"status_port"`
	}{}

	if err := json.Unmarshal(d, &x); err != nil {
		return err
	}
	t.Common = x.Common
	// Note: cannot use string(t.StatusPort)
	t.StatusPort = fmt.Sprintf("%v", x.StatusPort)
	return nil
}
