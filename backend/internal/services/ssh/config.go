package ssh

type RelayHopConfig struct {
	Host                        string `json:"host"`
	Port                        int    `json:"port"`
	Username                    string `json:"username"`
	Password                    string `json:"password,omitempty"`
	PrivateKey                  string `json:"privateKey,omitempty"`
	KeyPassphrase               string `json:"keyPassphrase,omitempty"`
	KeyboardInteractivePassword string `json:"keyboardInteractivePassword,omitempty"`
}

type SSHConnectionConfig struct {
	ID         string `json:"id"`
	Local      bool   `json:"local"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	Password   string `json:"password,omitempty"`
	PrivateKey string `json:"privateKey,omitempty"`
	KeyPassphrase               string `json:"keyPassphrase,omitempty"`
	KeyboardInteractivePassword string `json:"keyboardInteractivePassword,omitempty"`
	StartupCommand              string `json:"startupCommand,omitempty"`
	Environment                 map[string]string `json:"environment,omitempty"`
	// Legacy single relay (still supported when RelayHops is empty).
	RelayHost       string `json:"relayHost,omitempty"`
	RelayPort       int    `json:"relayPort,omitempty"`
	RelayUsername   string `json:"relayUsername,omitempty"`
	RelayPassword   string `json:"relayPassword,omitempty"`
	RelayPrivateKey string `json:"relayPrivateKey,omitempty"`
	RelayKeyPassphrase               string `json:"relayKeyPassphrase,omitempty"`
	RelayKeyboardInteractivePassword string `json:"relayKeyboardInteractivePassword,omitempty"`
	RelayHops []RelayHopConfig `json:"relayHops,omitempty"`
	// KeepAliveEnabled sends periodic SSH keep-alive requests (nil = enabled).
	KeepAliveEnabled *bool `json:"keepAliveEnabled,omitempty"`
	// KeepAliveIntervalSeconds is the interval between keep-alives (0 = 30s default).
	KeepAliveIntervalSeconds int `json:"keepAliveIntervalSeconds,omitempty"`
}
