import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";

const TypewriterSpinner = ({ text = "Loading..." }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [index, text]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {displayedText}
        {showCursor && "|"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Fond transparent
    zIndex: 1000,
  },
  text: {
    fontSize: 24,
    color: '#FF78B2',
    fontFamily: 'SF-Pro-Display-Bold',
  },
});

export default TypewriterSpinner;