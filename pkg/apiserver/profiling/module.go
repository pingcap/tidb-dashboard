package profiling

import "go.uber.org/fx"

var Module = fx.Options(newFetchers, newService)
