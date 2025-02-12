import React from 'react';
import { AnimatedScreenWrapper } from './AnimatedScreenWrapper';

export const withAnimation = (WrappedComponent) => {
  return (props) => (
    <AnimatedScreenWrapper>
      <WrappedComponent {...props} />
    </AnimatedScreenWrapper>
  );
};