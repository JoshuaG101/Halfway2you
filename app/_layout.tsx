import { Stack } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../FirebaseConfig';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import LoginAnimationOverlay from '../components/loginAnimationOverlay';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showLoginAnimation, setShowLoginAnimation] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="tabs" />
        ) : (
          <Stack.Screen name="login" />
        )}
      </Stack>

      {/* 🔥 Overlay animation */}
      {user && showLoginAnimation && (
        <LoginAnimationOverlay
          onFinish={() => setShowLoginAnimation(false)}
        />
      )}
    </>
  );
}
