// LoginAnimationOverlay.tsx
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import LoginAnimation from './loginAnimation';

type Props = {
  onFinish?: () => void;
};

export default function LoginAnimationOverlay({ onFinish }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const TOTAL_DURATION = 7 * 400 + 600;

    const timer = setTimeout(() => {
      setVisible(false);
      onFinish?.();
    }, TOTAL_DURATION);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <LoginAnimation />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 999,
    // Removed alignItems and justifyContent to allow full-screen background
  },
});
