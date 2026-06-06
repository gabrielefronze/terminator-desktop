package containers

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestParseContainerLines(t *testing.T) {
	output := `{"ID":"abc123","Names":"web","Image":"nginx:latest","Status":"Up 2 hours","State":"running"}
{"ID":"def456","Names":"/api","Image":"node:20","Status":"Up 5 minutes","State":"running"}`

	containers, err := parseContainerLines(output, RuntimeDocker)
	require.NoError(t, err)
	require.Len(t, containers, 2)
	require.Equal(t, "web", containers[0].Name)
	require.Equal(t, "api", containers[1].Name)
	require.Equal(t, RuntimeDocker, containers[0].Runtime)
}
