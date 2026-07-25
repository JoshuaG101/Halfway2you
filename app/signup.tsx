import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, firestore } from '../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Signup() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(firestore, 'users', email), {
        email,
        displayName: 'User',
        interests: [],
        groups: [],
        location: { lat: 0, lng: 0 },
      });

      router.replace('/tabs/map');
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account </Text>

      <TextInput
        placeholder="Email"
          placeholderTextColor="#000000" // optional

        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      {/* PASSWORD */}
      <View style={styles.passwordContainer}>
        <TextInput
          placeholder="Password"
            placeholderTextColor="#000000" // optional

          value={password}
          onChangeText={setPassword}
          style={styles.passwordInput}
          secureTextEntry={!showPassword}
        />

        <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={22}
            color="#E10044"
          />
        </TouchableOpacity>
      </View>

      {/* CONFIRM PASSWORD */}
      <TextInput
        placeholder="Confirm Password"
          placeholderTextColor="#000000" // optional
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry={!showPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleSignup}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.linkText}>
          Already have an account? Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E10044',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: '#000000',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E10044',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#000000',
  },
  button: {
    backgroundColor: '#E10044',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkText: {
    textAlign: 'center',
    color: '#007bff',
    fontWeight: '600',
  },
});
