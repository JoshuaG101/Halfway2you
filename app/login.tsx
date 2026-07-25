import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../FirebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ---------------------------
  // Login
  // ---------------------------
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      router.replace('./tabs');
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------------
  // Forgot password
  // ---------------------------
  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Reset Password', 'Please enter your email first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert(
        'Email Sent',
        'Check your email to reset your password.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Midway </Text>

      <TextInput
  style={[styles.input, { color: '#000000' }]} // <- add color here
        placeholder="Email"
          placeholderTextColor="#000000" // optional: placeholder gray

        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />

      {/* PASSWORD INPUT */}
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.passwordInput, { color: '#000000' }]}
          placeholder="Password"
            placeholderTextColor="#000000" // optional

          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color="#E10044"
          />
        </TouchableOpacity>
      </View>

      {/* FORGOT PASSWORD */}
      <TouchableOpacity onPress={handleForgotPassword}>
        <Text style={styles.forgotText}>Forgot password?</Text>
      </TouchableOpacity>

      {/* LOGIN */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.loginText}>
          {loading ? 'Logging in...' : 'Login'}
        </Text>
      </TouchableOpacity>

      {/* GO TO SIGNUP */}
      <TouchableOpacity onPress={() => router.push('/signup')}>
        <Text style={styles.signupText}>
          Don’t have an account? Sign up
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    
  },

  input: {
    borderWidth: 1,
    borderColor: '#E10044',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },

  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E10044',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#000000',
  },

  forgotText: {
    color: '#007bff',
    textAlign: 'right',
    marginBottom: 20,
  },

  loginButton: {
    backgroundColor: '#E10044',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 20,
  },

  loginText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  signupText: {
    textAlign: 'center',
    color: '#007bff',
  },
});
