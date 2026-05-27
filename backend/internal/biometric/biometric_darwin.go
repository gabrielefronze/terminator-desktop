//go:build darwin

package biometric

/*
#cgo darwin CFLAGS: -x objective-c -mmacosx-version-min=10.13.4
#cgo darwin LDFLAGS: -framework Security -framework LocalAuthentication -framework CoreFoundation -framework Foundation

#include <stdlib.h>
#include <stddef.h>

int terminator_biometric_available(void);
int terminator_biometric_has_stored(void);
int terminator_biometric_store(const char *password);
int terminator_biometric_load(char **passwordOut, size_t *passwordLen);
int terminator_biometric_delete(void);
*/
import "C"

import (
	"unsafe"
)

func platformAvailable() bool {
	return C.terminator_biometric_available() == 1
}

func platformHasStored() bool {
	return C.terminator_biometric_has_stored() == 1
}

func platformStore(password string) error {
	if !platformAvailable() {
		return ErrUnavailable
	}
	cPassword := C.CString(password)
	defer C.free(unsafe.Pointer(cPassword))

	status := C.terminator_biometric_store(cPassword)
	if status == 0 {
		return nil
	}
	return ErrFailed
}

func platformLoad() (string, error) {
	if !platformHasStored() {
		return "", ErrNotEnabled
	}

	var cPassword *C.char
	var length C.size_t
	status := C.terminator_biometric_load(&cPassword, &length)
	if cPassword != nil {
		defer C.free(unsafe.Pointer(cPassword))
	}

	switch status {
	case 0:
		return C.GoStringN(cPassword, C.int(length)), nil
	case 1:
		return "", ErrCancelled
	case 2:
		return "", ErrNotEnabled
	default:
		return "", ErrFailedStatus{Status: int(status)}
	}
}

func platformDelete() error {
	C.terminator_biometric_delete()
	return nil
}
