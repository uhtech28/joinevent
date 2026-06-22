import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, type WalletPayload } from '../lib/api';

const inr = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;
const QUICK = [100, 500, 1000, 2000];

export function WalletScreen() {
  const [data, setData] = useState<WalletPayload | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setData(await api.wallet.mine());
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const topup = async (rupees: number) => {
    setBusy(true);
    try {
      await api.wallet.topup(rupees * 100);
      await refresh();
      Alert.alert('Added', `₹${rupees} credited.`);
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available</Text>
        <Text style={styles.balance}>{data ? inr(data.wallet.balancePaise) : '…'}</Text>
        <Text style={styles.pending}>
          In escrow: {data ? inr(data.wallet.pendingPaise) : '…'}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Add money</Text>
      <View style={styles.quickRow}>
        {QUICK.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.quick, busy && { opacity: 0.6 }]}
            onPress={() => topup(r)}
            disabled={busy}
          >
            <Text style={styles.quickText}>+ ₹{r}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent activity</Text>
      <FlatList
        data={data?.entries ?? []}
        keyExtractor={(e) => e.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.entry}>
            <View style={{ flex: 1 }}>
              <Text style={styles.entryReason}>{item.reason}</Text>
              <Text style={styles.entryDate}>
                {new Date(item.createdAt).toLocaleString('en-IN')}
              </Text>
            </View>
            <Text
              style={[
                styles.entryAmount,
                { color: item.direction === 'C' ? '#15803D' : '#B91C1C' },
              ]}
            >
              {item.direction === 'C' ? '+' : '−'} {inr(item.amountPaise)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#6B7280', marginTop: 24 }}>
            Nothing yet.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8F0' },
  balanceCard: {
    margin: 20,
    padding: 24,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  balanceLabel: { color: 'white', opacity: 0.8, fontWeight: '700', fontSize: 12 },
  balance: { color: 'white', fontSize: 40, fontWeight: '800', marginTop: 4 },
  pending: { color: 'white', opacity: 0.85, marginTop: 8, fontSize: 13 },
  sectionTitle: {
    fontWeight: '700',
    color: '#171717',
    fontSize: 14,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  quickRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  quick: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0001',
  },
  quickText: { fontWeight: '700', color: '#171717' },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#0001',
  },
  entryReason: { fontWeight: '700', color: '#171717' },
  entryDate: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  entryAmount: { fontWeight: '700' },
});
