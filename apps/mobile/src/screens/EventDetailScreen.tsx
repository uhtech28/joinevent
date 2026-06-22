import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { api, type ApiEvent } from '../lib/api';
import type { RootStackParamList } from '../navigation/RootNavigator';

export function EventDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'EventDetail'>>();
  const [event, setEvent] = useState<ApiEvent | null>(null);

  useEffect(() => {
    api.eventBySlug(route.params.slug).then(setEvent).catch(() => setEvent(null));
  }, [route.params.slug]);

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F0' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const cover = event.coverImages[0];

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: '#FFF8F0' }}>
      <ScrollView>
        {cover && <Image source={{ uri: cover }} style={styles.cover} />}
        <View style={styles.body}>
          <Text style={styles.title}>{event.title}</Text>
          <Text style={styles.meta}>
            🗓 {new Date(event.startsAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
          <Text style={styles.meta}>📍 {event.addressText}</Text>
          <Text style={styles.meta}>
            By <Text style={styles.bold}>@{event.organiser.username}</Text> · ⭐{' '}
            {event.organiser.avgRating.toFixed(2)}
          </Text>

          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.body_p}>{event.description}</Text>

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Tap "Book stall" on the website — booking flow is wired in the next mobile release.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 260 },
  body: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#171717' },
  meta: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  bold: { color: '#171717', fontWeight: '700' },
  sectionTitle: { marginTop: 24, fontSize: 16, fontWeight: '700', color: '#171717' },
  body_p: { fontSize: 14, lineHeight: 22, color: '#555', marginTop: 8 },
  note: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF4E8',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FF6B35aa',
    borderStyle: 'dashed',
  },
  noteText: { color: '#E85D2A', fontSize: 13, lineHeight: 18 },
});
