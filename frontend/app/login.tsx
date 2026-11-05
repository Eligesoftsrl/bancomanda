import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, formatApiError } from '../src/store/authStore';

const BrandPanel = ({ wide }: { wide: boolean }) => (
  <View style={[styles.brand, wide ? styles.brandWide : styles.brandNarrow]}>
    <Image source={require('../assets/images/icon.png')} style={styles.brandLogo} resizeMode="contain" />
    <Text style={styles.brandName}>Bancomanda</Text>
    <Text style={styles.brandTagline}>Ordini, menu del giorno e cucina del tuo locale, su ogni iPad.</Text>
  </View>
);

export default function LoginScreen() {
  const login = useAuthStore((s) => s.login);
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Inserisci email e password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (e: any) {
      setError(formatApiError(e, 'Accesso non riuscito. Riprova.'));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="login-screen">
      <KeyboardAvoidingView style={[styles.inner, wide && styles.innerWide]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <BrandPanel wide={wide} />
        <View style={styles.formWrap}>
          <View style={styles.form}>
            <Text style={styles.title}>Accedi al tuo locale</Text>
            <Text style={styles.subtitle}>Resterai collegato su questo iPad finché non premi Esci.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="nome@locale.it"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              returnKeyType="next"
              testID="login-email-input"
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="La tua password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                testID="login-password-input"
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword(!showPassword)} testID="login-toggle-password">
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {!!error && (
              <View style={styles.errorBox} testID="login-error">
                <Ionicons name="alert-circle" size={18} color="#DB0007" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              testID="login-submit-button"
            >
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Accedi</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  inner: { flex: 1 },
  innerWide: { flexDirection: 'row' },
  brand: { backgroundColor: '#1a202c', padding: 40, justifyContent: 'center' },
  brandWide: { flex: 1, paddingHorizontal: 64 },
  brandNarrow: { paddingVertical: 32, alignItems: 'center' },
  brandLogo: { width: 72, height: 72, borderRadius: 18, marginBottom: 20 },
  brandName: { color: '#ffffff', fontSize: 40, fontWeight: '800', letterSpacing: -0.5 },
  brandTagline: { color: '#cbd5e1', fontSize: 17, lineHeight: 25, marginTop: 12, maxWidth: 380 },
  formWrap: { flex: 1, justifyContent: 'center', padding: 32 },
  form: { width: '100%', maxWidth: 420, alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1a202c' },
  subtitle: { fontSize: 15, color: '#64748b', marginTop: 8, marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dde4ee',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#1a202c',
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, paddingRight: 52 },
  eyeButton: { position: 'absolute', right: 6, padding: 10 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fdecec',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  errorText: { color: '#b00006', fontSize: 14, flex: 1 },
  button: {
    backgroundColor: '#DB0007',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
