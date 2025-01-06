import React, { useState, useEffect } from "react";
import { Text, View, StyleSheet } from "react-native";
import { styles } from "../../infrastructure/theme/styles";

const TypewriterLoader = () => {
  const text = "Undy...";
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
  }, [index]);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev); // Alterne le curseur visible/invisible
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <View style={styles.containerLoader}>
      <Text style={styles.h2}>
        {displayedText}
        {showCursor && "|"} {/* Ajout du curseur */}
      </Text>
    </View>
  );
};


export default TypewriterLoader;
