import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, type ApiEvent } from '../lib/api';
import { useAuth } from '../lib/auth';
import { EventCard } from '../components/EventCard';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Events'>;

export function EventsScreen() {
  const navigation = useNavigation<Nav>();
  const auth = useAuth();
  const [events, setEvents] = useState<ApiEvent[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await api.listEvents();
      setEvents(res.items);
    } catch {
      setEvents([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Discover</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.linkBtn}>💰 Wallet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Bookings')}>
            <Text style={styles.linkBtn}>🎪 Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => auth.signOut()}>
            <Text style={styles.linkBtn}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!events ? (
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          renderItem={({ item }) => (
            <EventCard
              event={item}
              onPress={() => navigation.navigate('EventDetail', { slug: item.slug })}
            />
          )}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 60, color: '#6B7280' }}>
              No events yet.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  headerRow: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heading: { fontSize: 28, fontWeight: '800', color: '#171717' },
  headerButtons: { flexDirection: 'row', gap: 12 },
  linkBtn: { color: '#FF6B35', fontWeight: '700', fontSize: 13 },
  list: { padding: 16, paddingTop: 8 },
});
