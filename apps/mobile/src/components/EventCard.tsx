import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ApiEvent } from '../lib/api';

const inr = (paise: number | null) =>
  paise == null ? null : `₹${(paise / 100).toLocaleString('en-IN')}`;

export function EventCard({
  event,
  onPress,
}: {
  event: ApiEvent;
  onPress: () => void;
}) {
  const cover = event.coverImages[0];
  const price = inr(event.stalls.priceFromPaise);

  return (
    <TouchableOpacity onPress={onPress} style={styles.card} activeOpacity={0.85}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, { backgroundColor: '#FFD4B8' }]} />
      )}
      {event.isFeatured && (
        <View style={styles.featuredPill}>
          <Text style={styles.featuredText}>⭐ Featured</Text>
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.meta}>
          @{event.organiser.username} · ⭐ {event.organiser.avgRating.toFixed(1)}
        </Text>
        {event.society && <Text style={styles.society}>📍 {event.society.name}</Text>}
        <View style={styles.row}>
          <Text style={styles.stalls}>
            <Text style={styles.stallsCount}>{event.stalls.available}</Text> stalls left
          </Text>
          {price && (
            <Text style={styles.price}>
              <Text style={styles.priceFrom}>from </Text>
              {price}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cover: { height: 160, width: '100%' },
  featuredPill: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#6C3BFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredText: { color: 'white', fontSize: 11, fontWeight: '800' },
  body: { padding: 16 },
  title: { fontSize: 16, fontWeight: '700', color: '#171717' },
  meta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  society: { fontSize: 12, color: '#E85D2A', marginTop: 6, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'flex-end' },
  stalls: { fontSize: 13, color: '#6B7280' },
  stallsCount: { color: '#16A34A', fontWeight: '700' },
  price: { fontSize: 14, fontWeight: '700', color: '#171717' },
  priceFrom: { fontSize: 10, color: '#9AA0A6', fontWeight: '400' },
});
