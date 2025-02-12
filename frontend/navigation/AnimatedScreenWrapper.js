import React from 'react';
import { Animated } from 'react-native';
import { Background } from './Background';
import { useLoadingState } from '../infrastructure/context/LoadingStateContexte';

export const AnimatedScreenWrapper = ({ children }) => {
  const { getAnimatedStyle } = useLoadingState();

  return (
    <Background>
      <Animated.View style={[{ flex: 1 }, getAnimatedStyle()]}>
        {children}
      </Animated.View>
    </Background>
  );
};