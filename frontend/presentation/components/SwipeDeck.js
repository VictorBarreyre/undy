import React, { useState, useRef } from 'react';
import { Animated, PanResponder, Dimensions, StyleSheet } from 'react-native';
import { Box } from 'native-base'; 
import CardHome from './CardHome';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 0.25 * SCREEN_WIDTH;
const SWIPE_OUT_DURATION = 250;

const SwipeDeck = ({ data, renderCard, onSwipeRight, onSwipeLeft }) => {
  const [index, setIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  const forceSwipe = (direction) => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction) => {
    const item = data[index];
    direction === 'right' ? onSwipeRight(item) : onSwipeLeft(item);
    position.setValue({ x: 0, y: 0 });
    setIndex(index + 1);
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['-120deg', '0deg', '120deg']
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }]
    };
  };

  if (index >= data.length) {
    return (
      <Box style={styles.container}>
        <Text>No more cards</Text>
      </Box>
    );
  }

  return (
    <Box style={styles.container}>
      <Animated.View
        style={[getCardStyle(), styles.cardStyle]}
        {...panResponder.panHandlers}
      >
        <CardHome {...data[index]} />
      </Animated.View>
    </Box>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height:'100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardStyle: {
    width: SCREEN_WIDTH * 0.9,
    position: 'absolute',
    height:'100%',
  }
});


export default SwipeDeck;
