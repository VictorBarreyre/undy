import { createStackNavigator } from '@react-navigation/stack';
import ConversationsList from '../../presentation/screens/ConversationList'
import ChatScreen from '../../presentation/screens/ChatScreen'



const Stack = createStackNavigator();

const ConversationStackNavigator = () => (
    <Stack.Navigator>
        <Stack.Screen
            name="Conversations"
            component={ConversationsList}
            options={{ headerShown: false }} />
        <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ headerShown: false }} />
    </Stack.Navigator>
);

export default ConversationStackNavigator;