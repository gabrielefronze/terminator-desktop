package apperror

type ErrorCode string

const (
	CodeNotFound           = ErrorCode("NOT_FOUND")
	CodeValidationFailed   = ErrorCode("VALIDATION_FAILED")
	CodeDecryptionFailed   = ErrorCode("DECRYPTION_FAILED")
	CodeVaultLocked        = ErrorCode("VAULT_LOCKED")
	CodeNetworkFailed      = ErrorCode("NETWORK_FAILED")
	CodeSSHConnectionError = ErrorCode("SSH_CONNECTION_FAILED")
	CodeSSHSessionNotFound        = ErrorCode("SSH_SESSION_NOT_FOUND")
	CodeSSHKeyPassphraseRequired  = ErrorCode("SSH_KEY_PASSPHRASE_REQUIRED")
	CodeSSHHostKeyNotTrusted      = ErrorCode("SSH_HOST_KEY_NOT_TRUSTED")

	CodeBiometricUnavailable = ErrorCode("BIOMETRIC_UNAVAILABLE")
	CodeBiometricNotEnabled  = ErrorCode("BIOMETRIC_NOT_ENABLED")
	CodeBiometricCancelled   = ErrorCode("BIOMETRIC_CANCELLED")
	CodeBiometricFailed      = ErrorCode("BIOMETRIC_FAILED")
	CodeBiometricStale       = ErrorCode("BIOMETRIC_STALE")

	CodeInternalError = ErrorCode("INTERNAL_ERROR")
	CodeUnknownError  = ErrorCode("UNKNOWN_ERROR")
	CodeAPIError      = ErrorCode("API_ERROR")
)
