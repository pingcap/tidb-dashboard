package logsearch

type Ni struct {
	from  int
	node  *LinePreview
	value int64
}
type minHeap struct {
	size    int
	maxsize int
	heap    []Ni
}

func (m *minHeap) heapfyUp(index int) {
	for index >= 0 {
		if (index-1)/2 >= 0 && m.heap[(index-1)/2].value > m.heap[index].value {
			m.heap[index], m.heap[(index-1)/2] = m.heap[(index-1)/2], m.heap[index]
			index = (index - 1) / 2
		} else {
			break
		}
	}
}

func (m *minHeap) heapfyDown(index int) {
	for index < m.size {
		s := index
		l := 2*index + 1
		if l < m.size && m.heap[l].value < m.heap[s].value {
			s = l
		}
		if l+1 < m.size && m.heap[l+1].value < m.heap[s].value {
			s = l + 1
		}
		if s != index {
			m.heap[index], m.heap[s] = m.heap[s], m.heap[index]
			index = s
		} else {
			break
		}
	}
}

func (m *minHeap) add(node Ni) {
	if m.size < m.maxsize {
		m.heap = append(m.heap, node)
		m.size++
		m.heapfyUp(m.size - 1)
	}
}

func (m *minHeap) pop(currIndies []int, lists []*LogPreview) *LinePreview {
	temp := m.heap[0]
	i := temp.from
	if currIndies[i] < len(lists[i].preview) {
		node := &LinePreview{
			TaskID:     lists[i].task.ID,
			ServerType: lists[i].task.ServerType,
			Address:    lists[i].task.address(),
			Message:    lists[i].preview[currIndies[i]],
		}
		m.heap[0] = Ni{i, node, node.Message.Time}
		currIndies[temp.from]++
	} else {
		m.heap[0] = m.heap[m.size-1]
		m.size--
		m.maxsize--
	}
	m.heapfyDown(0)
	return temp.node
}

func mergeLines(lists []*LogPreview) []*LinePreview {
	l := len(lists)
	if l < 1 {
		return nil
	}
	res := make([]*LinePreview, 0)
	m := minHeap{0, 0, []Ni{}}
	currIndies := make([]int, l)
	for i := 0; i < l; i++ {
		if currIndies[i] < len(lists[i].preview) {
			m.maxsize++
			node := &LinePreview{
				TaskID:     lists[i].task.ID,
				ServerType: lists[i].task.ServerType,
				Address:    lists[i].task.address(),
				Message:    lists[i].preview[currIndies[i]],
			}
			m.add(Ni{i, node, node.Message.Time})
			currIndies[i]++
		}
	}
	for m.size > 0 {
		temp := m.pop(currIndies, lists)
		if len(res) >= PreviewLogLinesLimit {
			break
		}
		res = append(res, temp)
	}
	return res
}
