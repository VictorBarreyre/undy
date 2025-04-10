import React from 'react';
import { Image } from 'native-base';

const Avatar = React.memo(({ source }) => (
  <Image
    source={source}
    alt="Profile"
    size={8}
    rounded="full"
  />
));

export default Avatar;
