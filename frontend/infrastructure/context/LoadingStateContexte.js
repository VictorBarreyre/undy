// LoadingStateContext.js
import React, { createContext, useContext, useRef } from 'react';
import { Animated } from 'react-native';

const LoadingStateContext = createContext();

export const useLoadingState = () => useContext(LoadingStateContext);

export const LoadingStateProvider = ({ children }) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const startLoading = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const getAnimatedStyle = () => ({
    opacity: fadeAnim,
  });

  return (
    <LoadingStateContext.Provider value={{ startLoading, getAnimatedStyle }}>
      {children}
    </LoadingStateContext.Provider>
  );
};