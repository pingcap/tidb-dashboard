// Code generated by mockery v2.9.4. DO NOT EDIT.

package topo

import (
	context "context"

	mock "github.com/stretchr/testify/mock"
)

// MockTopologyProvider is an autogenerated mock type for the TopologyProvider type
type MockTopologyProvider struct {
	mock.Mock
}

// GetAlertManager provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetAlertManager(ctx context.Context) (*AlertManagerInfo, error) {
	ret := _m.Called(ctx)

	var r0 *AlertManagerInfo
	if rf, ok := ret.Get(0).(func(context.Context) *AlertManagerInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*AlertManagerInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetGrafana provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetGrafana(ctx context.Context) (*GrafanaInfo, error) {
	ret := _m.Called(ctx)

	var r0 *GrafanaInfo
	if rf, ok := ret.Get(0).(func(context.Context) *GrafanaInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*GrafanaInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetPD provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetPD(ctx context.Context) ([]PDInfo, error) {
	ret := _m.Called(ctx)

	var r0 []PDInfo
	if rf, ok := ret.Get(0).(func(context.Context) []PDInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]PDInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetPrometheus provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetPrometheus(ctx context.Context) (*PrometheusInfo, error) {
	ret := _m.Called(ctx)

	var r0 *PrometheusInfo
	if rf, ok := ret.Get(0).(func(context.Context) *PrometheusInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).(*PrometheusInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetTiDB provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetTiDB(ctx context.Context) ([]TiDBInfo, error) {
	ret := _m.Called(ctx)

	var r0 []TiDBInfo
	if rf, ok := ret.Get(0).(func(context.Context) []TiDBInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]TiDBInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetTiFlash provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetTiFlash(ctx context.Context) ([]TiFlashStoreInfo, error) {
	ret := _m.Called(ctx)

	var r0 []TiFlashStoreInfo
	if rf, ok := ret.Get(0).(func(context.Context) []TiFlashStoreInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]TiFlashStoreInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}

// GetTiKV provides a mock function with given fields: ctx
func (_m *MockTopologyProvider) GetTiKV(ctx context.Context) ([]TiKVStoreInfo, error) {
	ret := _m.Called(ctx)

	var r0 []TiKVStoreInfo
	if rf, ok := ret.Get(0).(func(context.Context) []TiKVStoreInfo); ok {
		r0 = rf(ctx)
	} else {
		if ret.Get(0) != nil {
			r0 = ret.Get(0).([]TiKVStoreInfo)
		}
	}

	var r1 error
	if rf, ok := ret.Get(1).(func(context.Context) error); ok {
		r1 = rf(ctx)
	} else {
		r1 = ret.Error(1)
	}

	return r0, r1
}
