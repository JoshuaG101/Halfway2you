// FloatingBackground.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

type Shape = {
  size: number;
  color: string;
  startX: number; // 0 to 1 (percentage of screen width)
  startY: number; // 0 to 1 (percentage of screen height)
  floatDistance: number;
  duration: number;
};

const shapes: Shape[] = [
  { size: 150, color: 'rgba(255, 200, 200, 0.3)', startX: 0.2, startY: 0.1, floatDistance: 20, duration: 8000 },
  { size: 120, color: 'rgba(200, 200, 255, 0.3)', startX: 0.6, startY: 0.5, floatDistance: 30, duration: 12000 },
  { size: 100, color: 'rgba(200, 255, 200, 0.3)', startX: 0.8, startY: 0.2, floatDistance: 25, duration: 10000 },
  { size: 180, color: 'rgba(255, 255, 200, 0.2)', startX: 0.1, startY: 0.7, floatDistance: 35, duration: 14000 },
];

const FloatingBackground = () => {
  const animations = useRef(shapes.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    animations.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: shapes[i].duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: shapes[i].duration,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, [animations]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {shapes.map((shape, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: shape.size,
            height: shape.size,
            borderRadius: shape.size / 2,
            backgroundColor: shape.color,
            top: shape.startY * height,
            left: shape.startX * width,
            transform: [
              {
                translateY: animations[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, shape.floatDistance],
                }),
              },
              {
                translateX: animations[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, shape.floatDistance / 2], // subtle horizontal drift
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
};

export default FloatingBackground;
