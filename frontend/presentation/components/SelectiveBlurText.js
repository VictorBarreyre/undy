import React, { useMemo } from 'react';
import { View, Text, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import { styles } from '../../infrastructure/theme/styles';

const generateBlurIndices = (textContent) => {
    const words = textContent.split(' ');
    const totalWords = words.length;
    if (totalWords <= 2) return [0];

    const blurIndices = [0];
    const targetBlurCount = Math.ceil((totalWords - 1) / 2);
    const availableIndices = Array.from({ length: totalWords - 1 }, (_, i) => i + 1);

    for (let i = availableIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
    }

    blurIndices.push(...availableIndices.slice(0, targetBlurCount - 1));
    return blurIndices.sort((a, b) => a - b);
};

const BlurredWord = ({ word }) => (
    <View style={{ position: 'relative' }}>
        {/* Texte original - visible */}
        <Text style={styles.h3}>{word}</Text>
        {/* Conteneur de flou qui se superpose */}
        <View
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: 'hidden',
            }}
        >
            <BlurView
                style={{
                    position: 'absolute',
                    top: -50,  // Plus large que la zone de texte
                    left: -50,
                    bottom: -50,
                    right: -50,
                }}
                blurType="light"
                blurAmount={8}
                backgroundColor='rgba(255, 255, 255, 0.6)'
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.8)"
            />
        </View>
    </View>
);

const BlurredTextComponent = ({ content  }) => {
    const blurredWordsIndices = useMemo(() => generateBlurIndices(content), [content]);
    const words = content.split(' ');

    return (
        <View style={{
            marginLeft: 28,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 4,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            width: '100%'
        }}>
            {words.map((word, index) => (
                <React.Fragment key={index}>
                    {blurredWordsIndices.includes(index) ? (
                        <BlurredWord word={word} />
                    ) : (
                        <Text style={styles.h3}>{word}</Text>
                    )}
                </React.Fragment>
            ))}
        </View>
    );
};

export default BlurredTextComponent;