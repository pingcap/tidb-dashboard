// Copyright 2021 PingCAP, Inc. Licensed under Apache-2.0.

package shared

import "github.com/pingcap/tidb-dashboard/util/featureflag"

type AuthFeatureFlags struct {
	NonRootLogin *featureflag.FeatureFlag
}

func ProvideFeatureFlags(featureFlags *featureflag.Registry) *AuthFeatureFlags {
	return &AuthFeatureFlags{
		NonRootLogin: featureFlags.Register("nonRootLogin", ">= 5.3.0"),
	}
}
