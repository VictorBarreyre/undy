import React, { useState, useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { styles } from "../../infrastructure/theme/styles";
import { Background } from "../../navigation/Background";

const TypewriterLoader = () => {
  const text = "hushy...";
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  
  const textInterval = useRef(null);
  const cursorInterval = useRef(null);

  useEffect(() => {
    textInterval.current = setInterval(() => {
      if (index < text.length) {
        setDisplayedText((prev) => prev + text.charAt(index));
        setIndex((prev) => prev + 1);
      }
    }, 150);

    return () => {
      if (textInterval.current) {
        clearInterval(textInterval.current);
      }
    };
  }, [index]);

  useEffect(() => {
    cursorInterval.current = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      if (cursorInterval.current) {
        clearInterval(cursorInterval.current);
      }
    };
  }, []);

  return (
    <Background>
      <View style={styles.containerLoader}>
        <Text style={styles.h2}>
          {displayedText}
          {showCursor && "|"}
        </Text>
      </View>
    </Background>
  );
};

export default TypewriterLoader;