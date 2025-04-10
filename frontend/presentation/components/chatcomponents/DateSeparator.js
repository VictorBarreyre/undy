import React from 'react';
import { Text } from 'native-base';
import { useDateFormatter } from '../../../utils/dateFormatters';
import { styles } from '../../../infrastructure/theme/styles';

const DateSeparator = React.memo(({ timestamp }) => {
  const dateFormatter = useDateFormatter();

  return (
    <Text style={styles.littleCaption} textAlign="center" color="#94A3B8" mb={4} mt={10}>
      {dateFormatter.formatDate(timestamp)}
    </Text>
  );
});

export default DateSeparator;
