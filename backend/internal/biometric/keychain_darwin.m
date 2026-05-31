#import <CoreFoundation/CoreFoundation.h>
#import <Foundation/Foundation.h>
#import <LocalAuthentication/LocalAuthentication.h>
#import <Security/Security.h>
#import <dispatch/dispatch.h>
#import <stdlib.h>
#import <string.h>

static CFStringRef terminatorService(void) {
    return CFSTR("com.elemento.nexus");
}

static CFStringRef terminatorAccount(void) {
    return CFSTR("master-password");
}

static void deleteExisting(void) {
    NSDictionary *query = @{
        (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService : (__bridge id)terminatorService(),
        (__bridge id)kSecAttrAccount : (__bridge id)terminatorAccount(),
    };
    SecItemDelete((__bridge CFDictionaryRef)query);
}

static void runOnMainSync(void (^block)(void)) {
    if ([NSThread isMainThread]) {
        block();
        return;
    }
    dispatch_semaphore_t sema = dispatch_semaphore_create(0);
    dispatch_async(dispatch_get_main_queue(), ^{
        block();
        dispatch_semaphore_signal(sema);
    });
    dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);
}

// Returns 1 = ok, 0 = user cancelled, <0 = failure (LA error code or -1).
static int promptUserPresence(void) {
    __block int result = -1;
    LAContext *context = [[LAContext alloc] init];
    context.localizedReason = @"Unlock Elemento Nexus";
    context.localizedFallbackTitle = @"";

    dispatch_semaphore_t sema = dispatch_semaphore_create(0);

    void (^reply)(BOOL, NSError *) = ^(BOOL success, NSError *error) {
        if (success) {
            result = 1;
        } else if (error != nil &&
                   (error.code == LAErrorUserCancel || error.code == LAErrorSystemCancel ||
                    error.code == LAErrorAppCancel)) {
            result = 0;
        } else {
            result = error != nil ? (int)error.code : -1;
        }
        dispatch_semaphore_signal(sema);
    };

    if ([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:nil]) {
        [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                localizedReason:context.localizedReason
                          reply:reply];
    } else {
        [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
                localizedReason:context.localizedReason
                          reply:reply];
    }

    dispatch_semaphore_wait(sema, DISPATCH_TIME_FOREVER);
    return result;
}

static int mapCopyStatus(OSStatus status) {
    if (status == errSecSuccess) {
        return 0;
    }
    if (status == errSecUserCanceled || status == errSecAuthFailed) {
        return 1;
    }
    if (status == errSecItemNotFound) {
        return 2;
    }
    return (int)status;
}

static int readPasswordData(char **passwordOut, size_t *passwordLen) {
    NSDictionary *query = @{
        (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
        (__bridge id)kSecAttrService : (__bridge id)terminatorService(),
        (__bridge id)kSecAttrAccount : (__bridge id)terminatorAccount(),
        (__bridge id)kSecReturnData : @YES,
        (__bridge id)kSecMatchLimit : (__bridge id)kSecMatchLimitOne,
    };

    CFTypeRef result = NULL;
    OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
    int mapped = mapCopyStatus(status);
    if (mapped != 0) {
        if (result != NULL) {
            CFRelease(result);
        }
        return mapped;
    }
    if (result == NULL) {
        return -3;
    }

    NSData *data = (__bridge_transfer NSData *)result;
    if (data.length == 0) {
        return -3;
    }

    char *buffer = (char *)malloc(data.length + 1);
    if (buffer == NULL) {
        return -4;
    }
    memcpy(buffer, data.bytes, data.length);
    buffer[data.length] = '\0';
    *passwordOut = buffer;
    *passwordLen = data.length;
    return 0;
}

int terminator_biometric_available(void) {
    __block int available = 0;
    runOnMainSync(^{
        LAContext *context = [[LAContext alloc] init];
        NSError *error = nil;
        if ([context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error] ||
            [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error]) {
            available = 1;
        }
    });
    return available;
}

int terminator_biometric_has_stored(void) {
    __block int stored = 0;
    runOnMainSync(^{
        NSDictionary *query = @{
            (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
            (__bridge id)kSecAttrService : (__bridge id)terminatorService(),
            (__bridge id)kSecAttrAccount : (__bridge id)terminatorAccount(),
            (__bridge id)kSecMatchLimit : (__bridge id)kSecMatchLimitOne,
            (__bridge id)kSecReturnAttributes : @YES,
        };

        CFTypeRef result = NULL;
        OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, &result);
        if (result != NULL) {
            CFRelease(result);
        }
        stored = status == errSecSuccess ? 1 : 0;
    });
    return stored;
}

int terminator_biometric_store(const char *password) {
    if (password == NULL) {
        return -1;
    }

    __block int storeStatus = -1;
    runOnMainSync(^{
        NSData *passwordData = [NSData dataWithBytes:password length:strlen(password)];
        if (passwordData == nil || passwordData.length == 0) {
            storeStatus = -1;
            return;
        }

        deleteExisting();

        // Touch ID gate is enforced in load(); keychain item uses standard protection.
        NSDictionary *attributes = @{
            (__bridge id)kSecClass : (__bridge id)kSecClassGenericPassword,
            (__bridge id)kSecAttrService : (__bridge id)terminatorService(),
            (__bridge id)kSecAttrAccount : (__bridge id)terminatorAccount(),
            (__bridge id)kSecValueData : passwordData,
            (__bridge id)kSecAttrAccessible : (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        };

        OSStatus status = SecItemAdd((__bridge CFDictionaryRef)attributes, NULL);
        storeStatus = status == errSecSuccess ? 0 : (int)status;
    });
    return storeStatus;
}

// status: 0 ok, 1 cancelled, 2 not found, other <0 OSStatus/LA error
int terminator_biometric_load(char **passwordOut, size_t *passwordLen) {
    if (passwordOut == NULL || passwordLen == NULL) {
        return -1;
    }
    *passwordOut = NULL;
    *passwordLen = 0;

    __block int loadStatus = -1;
    runOnMainSync(^{
        int auth = promptUserPresence();
        if (auth == 0) {
            loadStatus = 1;
            return;
        }
        if (auth < 0) {
            loadStatus = auth;
            return;
        }
        loadStatus = readPasswordData(passwordOut, passwordLen);
    });
    return loadStatus;
}

int terminator_biometric_delete(void) {
    runOnMainSync(^{
        deleteExisting();
    });
    return 0;
}
