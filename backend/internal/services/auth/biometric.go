package auth

import (
	"context"
	"errors"
	"fmt"
	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/biometric"
	"terminator-desktop/backend/internal/crypto"
)

func (s *AuthService) BiometricAvailable(context.Context) (bool, error) {
	return biometric.Available(), nil
}

func (s *AuthService) BiometricEnabled(context.Context) (bool, error) {
	return biometric.HasStored(), nil
}

func (s *AuthService) EnableBiometric(ctx context.Context, password string) error {
	if !biometric.Available() {
		return apperror.New(apperror.CodeBiometricUnavailable, "Touch ID is not available on this device", nil)
	}
	if err := s.verifyPassword(ctx, password); err != nil {
		return err
	}
	if err := biometric.Store(password); err != nil {
		return mapBiometricError(err)
	}
	return nil
}

func (s *AuthService) DisableBiometric(context.Context) error {
	return biometric.Delete()
}

func (s *AuthService) LoginWithBiometric(ctx context.Context) error {
	if !biometric.HasStored() {
		return apperror.New(apperror.CodeBiometricNotEnabled, "Touch ID unlock is not enabled", nil)
	}
	password, err := biometric.Load()
	if err != nil {
		return mapBiometricError(err)
	}
	if err := s.Login(ctx, password); err != nil {
		var appErr *apperror.AppError
		if errors.As(err, &appErr) && appErr.Code == apperror.CodeDecryptionFailed {
			_ = biometric.Delete()
			return apperror.New(
				apperror.CodeBiometricStale,
				"Touch ID password is outdated. Re-enable Touch ID in Settings.",
				err,
			)
		}
		return err
	}
	return nil
}

func (s *AuthService) verifyPassword(ctx context.Context, password string) error {
	dbUser, err := s.q.GetUser(ctx)
	if err != nil {
		return err
	}

	kek, err := crypto.DeriveKEK(password, dbUser.KeySalt)
	if err != nil {
		return err
	}

	_, err = crypto.UnpackAndDecrypt(dbUser.EncryptedMasterKey, kek)
	if err != nil {
		return apperror.DecryptionFailed(err)
	}
	return nil
}

func mapBiometricError(err error) error {
	switch {
	case errors.Is(err, biometric.ErrUnavailable):
		return apperror.New(apperror.CodeBiometricUnavailable, "Touch ID is not available on this device", err)
	case errors.Is(err, biometric.ErrNotEnabled):
		return apperror.New(apperror.CodeBiometricNotEnabled, "Touch ID unlock is not enabled", err)
	case errors.Is(err, biometric.ErrCancelled):
		return apperror.New(apperror.CodeBiometricCancelled, "Touch ID was cancelled", err)
	default:
		msg := "Touch ID authentication failed"
		var statusErr biometric.ErrFailedStatus
		if errors.As(err, &statusErr) {
			msg = fmt.Sprintf("Touch ID authentication failed (status %d)", statusErr.Status)
		}
		return apperror.New(apperror.CodeBiometricFailed, msg, err)
	}
}
