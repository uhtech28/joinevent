import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';

export function LoginScreen() {
  const auth = useAuth();
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [busy, setBusy] = useState(false);

  const sendOtp = async () => {
    setBusy(true);
    try {
      const res = await api.auth.requestOtp(phone.trim());
      setStep('otp');
      if (res.otpDevOnly) setOtp(res.otpDevOnly);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      const res = await api.auth.verifyOtp(phone.trim(), otp.trim());
      await auth.signInAfterOtp(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Join Events.</Text>
      <Text style={styles.subtitle}>
        {step === 'phone' ? 'We\'ll send a 6-digit code.' : `Code sent to ${phone}`}
      </Text>

      {step === 'phone' ? (
        <>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+91XXXXXXXXXX"
            keyboardType="phone-pad"
            style={styles.input}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={sendOtp}
            disabled={busy}
          >
            <Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, styles.otpInput]}
            autoFocus
          />
          <TouchableOpacity
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={verify}
            disabled={busy || otp.length < 4}
          >
            <Text style={styles.buttonText}>{busy ? 'Verifying…' : 'Verify & continue'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setStep('phone')}>
            <Text style={styles.linkText}>← Use different number</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FFF8F0' },
  title: { fontSize: 48, fontWeight: '800', color: '#FF6B35', marginTop: 40 },
  subtitle: { fontSize: 16, color: '#5F6368', marginTop: 8, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#0001',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    fontSize: 18,
    marginBottom: 16,
  },
  otpInput: { fontSize: 28, letterSpacing: 12, textAlign: 'center', fontWeight: '700' },
  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  linkText: {
    textAlign: 'center',
    color: '#5F6368',
    fontWeight: '600',
    marginTop: 16,
  },
});
