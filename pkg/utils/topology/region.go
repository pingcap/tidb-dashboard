package topology

import (
	"fmt"
	"github.com/pingcap-incubator/tidb-dashboard/pkg/pd"
	"gopkg.in/oleiade/reflections.v1"
	"reflect"
	"strings"
)

// FetchRegions returns result (RawRegionsInfo) json in byte[]
func FetchRegions(pdClient *pd.Client) ([]byte, error) {
	return pdClient.SendGetRequest("/regions")
}

type RegionOrder byte

const (
	RegionOrderWrite RegionOrder = iota
	RegionOrderRead
)

var topRegionURL = []string{"/regions/writeflow", "/regions/readflow"}

// FetchTopNRegions returns result (RawRegionsInfo) json in byte[]
func FetchTopNRegions(pdClient *pd.Client, n int, order RegionOrder) ([]byte, error) {
	url := topRegionURL[order]
	if n > 0 {
		url = fmt.Sprintf("%s?limit=%d", url, n)
	}
	return pdClient.SendGetRequest(url)
}

func GenerateRegionDataCSV(rawData []interface{}, forceStringFields []string) (data [][]string) {
	fieldsMap := make(map[string]string)
	t := reflect.TypeOf(rawData[0])
	fieldsNum := t.NumField()
	allFields := make([]string, fieldsNum)
	for i := 0; i < fieldsNum; i++ {
		field := t.Field(i)
		allFields[i] = strings.ToLower(field.Tag.Get("json"))
		fieldsMap[allFields[i]] = field.Name
	}
	forceStringMap := make(map[string]struct{})
	for _, field := range forceStringFields {
		forceStringMap[field] = struct{}{}
	}
	data = make([][]string, 0, len(rawData)+1)
	data = append(data, allFields)
	for _, raw := range rawData {
		row := make([]string, 0, fieldsNum)
		for _, field := range allFields {
			fieldName := fieldsMap[field]
			s, _ := reflections.GetField(raw, fieldName)
			var val string
			switch t := s.(type) {
			case int:
				val = fmt.Sprintf("%d", t)
			case int64:
				val = fmt.Sprintf("%d", t)
			case uint64:
				val = fmt.Sprintf("%d", t)
			case float64:
				val = fmt.Sprintf("%f", t)
			default:
				val = fmt.Sprintf("%s", t)
			}
			if _, ok := forceStringMap[field]; ok {
				row = append(row, fmt.Sprintf("%s\t", val))
			} else {
				row = append(row, val)
			}
		}
		data = append(data, row)
	}
	return
}

func GetReplicationsInfo(pdClient *pd.Client, regions []RawRegionInfo) ([]interface{}, error) {
	storeToAddrMap := make(map[uint64]string)
	stores, err := fetchStores(pdClient)
	if err != nil {
		return nil, err
	}
	for _, store := range stores {
		storeToAddrMap[store.ID] = store.Address
	}
	tmp := make([]interface{}, 0, 40)
	for _, region := range regions {
		for _, peer := range region.Peers {
			tmp = append(tmp, ReplicationInfo{
				ID:              peer.Id,
				RegionID:        region.ID,
				StoreID:         peer.StoreId,
				StoreAddress:    storeToAddrMap[peer.StoreId],
				LeaderID:        region.Leader.Id,
				StartKey:        region.StartKey,
				EndKey:          region.EndKey,
				WrittenBytes:    region.WrittenBytes,
				ReadBytes:       region.ReadBytes,
				WrittenKeys:     region.WrittenKeys,
				ReadKeys:        region.ReadKeys,
				ApproximateSize: region.ApproximateSize,
				ApproximateKeys: region.ApproximateKeys,
			})
		}
	}
	return tmp, nil
}

func getReplicationsString(raw []Peer) string {
	if len(raw) == 0 {
		return ""
	}
	tmp := make([]string, len(raw))
	for i, peer := range raw {
		tmp[i] = fmt.Sprintf("%d@%d", peer.Id, peer.StoreId)
	}
	return strings.Join(tmp, ", ")
}

func getReplicationsStateString(raw []PeerStats) string {
	if len(raw) == 0 {
		return ""
	}
	tmp := make([]string, len(raw))
	for i, peer := range raw {
		tmp[i] = fmt.Sprintf("%d@%d[%ds]", peer.Peer.Id, peer.Peer.StoreId, peer.DownSeconds)
	}
	return strings.Join(tmp, ", ")
}

func GetRegionsInfo(regions []RawRegionInfo) ([]interface{}, error) {
	tmp := make([]interface{}, 0, 40)
	for _, region := range regions {
		tmp = append(tmp, RegionInfo{
			ID:                      region.ID,
			StartKey:                region.StartKey,
			EndKey:                  region.EndKey,
			WrittenBytes:            region.WrittenBytes,
			ReadBytes:               region.ReadBytes,
			WrittenKeys:             region.WrittenKeys,
			ReadKeys:                region.ReadKeys,
			ApproximateSize:         region.ApproximateSize,
			ApproximateKeys:         region.ApproximateKeys,
			LeaderID:                region.Leader.Id,
			LeaderStoreID:           region.Leader.StoreId,
			Replications:            getReplicationsString(region.Peers),
			PendingReplications:     getReplicationsString(region.PendingPeers),
			DownReplications:        getReplicationsStateString(region.DownPeers),
			ReplicationCount:        len(region.Peers),
			PendingReplicationCount: len(region.PendingPeers),
			DownReplicationCount:    len(region.DownPeers),
		})
	}
	return tmp, nil
}
