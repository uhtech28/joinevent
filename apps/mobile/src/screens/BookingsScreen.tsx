import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, type ApiBooking } from '../lib/api';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

export function BookingsScreen() {
  const [items, setItems] = useState<ApiBooking[] | null>(null);

  useEffect(() => {
    api.bookings
      .mine()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {!items ? (
        <ActivityIndicator size="large" color="#FF6B35" style={{ marginTop: 60 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>No bookings yet.</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(b) => b.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>{item.event?.title ?? '—'}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === 'confirmed'
                      ? styles.statusConfirmed
                      : item.status === 'cancelled'
                        ? styles.statusCancelled
                        : styles.statusOther,
                  ]}
                >
                  <Text style={styles.statusText}>{item.status}</Text>
                </View>
              </View>
              {item.event && (
                <Text style={styles.meta}>
                  🗓 {new Date(item.event.startsAt).toLocaleString('en-IN')}
                </Text>
              )}
              {item.event && <Text style={styles.meta}>📍 {item.event.addressText}</Text>}
              {item.stall && (
                <Text style={styles.meta}>
                  Stall: <Text style={styles.bold}>{item.stall.category}</Text>
                </Text>
              )}
              <Text style={styles.amount}>Paid {inr(item.amountPaise)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  empty: { textAlign: 'center', marginTop: 80, color: '#6B7280' },
  list: { padding: 16 },
  card: { backgroundColor: 'white', padding: 16, borderRadius: 16, marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontWeight: '700', fontSize: 16, color: '#171717', flex: 1, paddingRight: 8 },
  meta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  bold: { color: '#171717', fontWeight: '700' },
  amount: { marginTop: 8, fontWeight: '700', color: '#171717' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800', color: 'white' },
  statusConfirmed: { backgroundColor: '#16A34A' },
  statusCancelled: { backgroundColor: '#DC2626' },
  statusOther: { backgroundColor: '#9AA0A6' },
});
