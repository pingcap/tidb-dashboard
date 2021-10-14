// Copyright 2021 PingCAP, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// See the License for the specific language governing permissions and
// limitations under the License.

package tlsutil

import (
	"crypto/tls"
	"strings"
)

func GetHTTPScheme(c *tls.Config) string {
	if c == nil {
		return "http"
	}
	return "https"
}

func NormalizeURL(c *tls.Config, url string) string {
	const httpPrefix = "http://"
	const httpsPrefix = "https://"
	const httpPrefixLen = len(httpPrefix)

	isLeadingHTTP := strings.HasPrefix(url, httpPrefix)
	isLeadingHTTPS := strings.HasPrefix(url, httpsPrefix)
	if !isLeadingHTTP && !isLeadingHTTPS {
		return GetHTTPScheme(c) + "://" + url
	}
	if c != nil && isLeadingHTTP {
		return httpsPrefix + url[httpPrefixLen:]
	}
	return url
}
