/**
 * Biometric Authentication Service
 * Pro feature for app lock using Face ID / Touch ID / Fingerprint
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { Alert } from 'react-native';

/**
 * Check if biometric authentication is available on this device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Get the available biometric types
 * Returns 'Face ID', 'Touch ID', 'Fingerprint', or 'Biometric'
 */
export async function getBiometricType(): Promise<string> {
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face ID';
  }
  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    // iOS calls this Touch ID, Android calls it Fingerprint
    return 'Touch ID';
  }
  return 'Biometric';
}

/**
 * Authenticate the user with biometrics
 * @param reason - The reason shown to the user
 * @returns true if authentication succeeded
 */
export async function authenticateWithBiometrics(
  reason: string = 'Unlock SubscribeTracker'
): Promise<boolean> {
  try {
    const available = await isBiometricAvailable();
    if (!available) {
      return true; // If not available, skip authentication
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });

    return result.success;
  } catch (error) {
    console.error('Biometric authentication error:', error);
    return false;
  }
}

/**
 * Request biometric authentication for enabling the feature
 * Shows an alert if biometrics is not available
 */
export async function requestBiometricEnrollment(): Promise<boolean> {
  const available = await isBiometricAvailable();
  
  if (!available) {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      Alert.alert(
        'Not Supported',
        'Your device does not support biometric authentication.'
      );
    } else {
      Alert.alert(
        'Not Set Up',
        'Please set up Face ID, Touch ID, or Fingerprint in your device settings first.'
      );
    }
    return false;
  }
  
  // Verify the user can authenticate before enabling
  const success = await authenticateWithBiometrics('Verify your identity to enable biometric lock');
  return success;
}
