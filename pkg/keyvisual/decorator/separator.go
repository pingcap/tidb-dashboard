package decorator

import (
	"strings"

	"github.com/pingcap/log"
	"go.uber.org/zap"

	"github.com/pingcap-incubator/tidb-dashboard/pkg/config"
)

// NaiveLabelStrategy is one of the simplest LabelStrategy.
type separatorLabelStrategy struct {
	Separator string
}

func SeparatorLabelStrategy(cfg *config.KeyVisualConfig) LabelStrategy {
	return &separatorLabelStrategy{Separator: cfg.PolicyKVSeparator}
}

// ReloadConfig reset separator
func (s *separatorLabelStrategy) ReloadConfig(cfg *config.KeyVisualConfig) {
	s.Separator = cfg.PolicyKVSeparator

	log.Info("ReloadConfig", zap.String("Separator", s.Separator))
}

// CrossBorder is temporarily not considering cross-border logic
func (s *separatorLabelStrategy) CrossBorder(startKey, endKey string) bool {
	return false
}

// Label uses separator to split key
func (s *separatorLabelStrategy) Label(key string) (label LabelKey) {
	label.Key = key
	if s.Separator == "" {
		label.Labels = []string{key}
		return
	}
	label.Labels = strings.Split(key, s.Separator)
	return
}

func (s *separatorLabelStrategy) LabelGlobalStart() LabelKey {
	return s.Label("")
}

func (s *separatorLabelStrategy) LabelGlobalEnd() LabelKey {
	return s.Label("")
}
