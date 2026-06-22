import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { LoginScreen } from '../screens/LoginScreen';
import { EventsScreen } from '../screens/EventsScreen';
import { EventDetailScreen } from '../screens/EventDetailScreen';
import { WalletScreen } from '../screens/WalletScreen';
import { BookingsScreen } from '../screens/BookingsScreen';

export type RootStackParamList = {
  Login: undefined;
  Events: undefined;
  EventDetail: { slug: string };
  Wallet: undefined;
  Bookings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#FFF8F0' },
          headerTintColor: '#FF6B35',
          headerTitleStyle: { fontWeight: '800' },
        }}
      >
        {auth.status === 'anonymous' ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Sign in' }} />
        ) : (
          <>
            <Stack.Screen name="Events" component={EventsScreen} options={{ title: 'Events' }} />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{ title: '' }}
            />
            <Stack.Screen name="Wallet" component={WalletScreen} />
            <Stack.Screen name="Bookings" component={BookingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
