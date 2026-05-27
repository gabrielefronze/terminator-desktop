//go:build !darwin

package biometric

func platformAvailable() bool {
	return false
}

func platformHasStored() bool {
	return false
}

func platformStore(string) error {
	return ErrUnavailable
}

func platformLoad() (string, error) {
	return "", ErrUnavailable
}

func platformDelete() error {
	return nil
}
