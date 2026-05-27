package biometric

import "errors"

const (
	ServiceName = "com.terminator.desktop"
	AccountName = "master-password"
)

var (
	ErrUnavailable = errors.New("biometric authentication is not available")
	ErrNotEnabled  = errors.New("biometric unlock is not enabled")
	ErrCancelled   = errors.New("biometric authentication was cancelled")
	ErrFailed      = errors.New("biometric authentication failed")
)

// ErrFailedStatus wraps a platform status code for debugging.
type ErrFailedStatus struct {
	Status int
}

func (e ErrFailedStatus) Error() string {
	return ErrFailed.Error()
}

func (e ErrFailedStatus) Unwrap() error {
	return ErrFailed
}

// Available reports whether biometric hardware (Touch ID / Face ID) can be used.
func Available() bool {
	return platformAvailable()
}

// HasStored reports whether a master password is saved for biometric unlock.
func HasStored() bool {
	return platformHasStored()
}

// Store saves the master password in the secure keychain (Touch ID protected on macOS).
func Store(password string) error {
	return platformStore(password)
}

// Load retrieves the master password after biometric authentication.
func Load() (string, error) {
	return platformLoad()
}

// Delete removes the stored master password.
func Delete() error {
	return platformDelete()
}
