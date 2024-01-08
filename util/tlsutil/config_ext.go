// Copyright 2024 PingCAP, Inc. Licensed under Apache-2.0.

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
