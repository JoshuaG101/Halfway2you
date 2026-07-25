import { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { SvgUri } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

const images = [
  require('../assets/animationImages/1.svg'),
  require('../assets/animationImages/2.svg'),
  require('../assets/animationImages/3.svg'),
  require('../assets/animationImages/4.svg'),
  require('../assets/animationImages/5.svg'),
  require('../assets/animationImages/6.svg'),
  require('../assets/animationImages/7.svg'),
].map(img => require('react-native').Image.resolveAssetSource(img).uri);

export default function LoginAnimation() {
  const [index, setIndex] = useState(1);

  const fgOpacity = useSharedValue(0);
  const fgScale = useSharedValue(0.95);
  const bgOpacity = useSharedValue(1);
  const finalOpacity = useSharedValue(0);

  useEffect(() => {
    const isFinal = index === 6;
    const duration = isFinal ? 600 : 400;

    if (isFinal) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    fgOpacity.value = withSpring(1, { stiffness: 600, damping: 30 });
    fgScale.value = withSpring(1, { stiffness: 600, damping: 30 });

    const timer = setTimeout(() => {
      if (isFinal) {
        fgOpacity.value = withSpring(0, { stiffness: 600, damping: 30 });
        bgOpacity.value = withSpring(0, { stiffness: 600, damping: 30 });
        finalOpacity.value = withSpring(1, { stiffness: 600, damping: 30 });
        return;
      }

      fgOpacity.value = withSpring(0, { stiffness: 600, damping: 30 });

      setTimeout(() => {
        fgScale.value = 0.95;
        setIndex(i => i + 1);
      }, 80);
    }, duration);

    return () => clearTimeout(timer);
  }, [index]);

  // ---------- Animated styles ----------
  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const fgStyle = useAnimatedStyle(() => ({
    opacity: fgOpacity.value,
    transform: [{ scale: fgScale.value }],
  }));

  const finalStyle = useAnimatedStyle(() => ({
    opacity: finalOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* BACKGROUND — image 1 */}
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]}>
        <SvgUri
          uri={images[0]}
          width={width}        
          height={height}      
          preserveAspectRatio="xMinYMid slice"
        />
      </Animated.View>

      {/* FOREGROUND — images 2–6 */}
      {index < 6 && (
        <Animated.View style={[styles.centered, fgStyle]}>
          <SvgUri
            uri={images[index]}
            width={index === 3 ? width * 0.1 : width * 0.8}   // 4.svg smaller
            height={index === 3 ? height * 0.1 : height * 0.8}
            preserveAspectRatio="xMidYMid meet"
          />
        </Animated.View>
      )}

      {/* FINAL — image 7 fullscreen */}
      <Animated.View style={[StyleSheet.absoluteFill, finalStyle]}>
        <SvgUri
          uri={images[6]}
          width={width}
          height={height}
          preserveAspectRatio="xMidYMid slice"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
