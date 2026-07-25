import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { auth, firestore } from '../../FirebaseConfig';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const AVAILABLE_INTERESTS = ['cafe', 'bar', 'park', 'restaurant'];

export default function Settings() {
  const user = auth.currentUser;
  const email = user?.email;

  const [displayName, setDisplayName] = useState('User');
  const [interests, setInterests] = useState<string[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [isPremium, setIsPremium] = useState(false);

  // 🔥 PREMIUM FILTER STATE
  const [maxPriceLevel, setMaxPriceLevel] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [openNowOnly, setOpenNowOnly] = useState(false);

  const [loading, setLoading] = useState(true);

  if (!email) {
    return (
      <View style={styles.center}>
        <Text>Not logged in</Text>
      </View>
    );
  }

  /* ---------------- LOAD USER ---------------- */
  useEffect(() => {
    console.log('[PROFILE LOAD] Initializing listener for:', email);
    const userRef = doc(firestore, 'users', email);
    const unsub = onSnapshot(
      userRef,
      snap => {
        console.log('[PROFILE LOAD] User data updated:', snap.exists() ? snap.data() : 'not found');
        if (!snap.exists()) return;

        const d = snap.data();
        setDisplayName(d.displayName || 'User');
        setInterests(d.interests || []);
        setRadiusMiles(d.searchRadiusMiles ?? 5);
        setIsPremium(!!d.premium);

        setMaxPriceLevel(d.filters?.maxPriceLevel ?? null);
        setMinRating(d.filters?.minRating ?? null);
        setOpenNowOnly(!!d.filters?.openNowOnly);

        setLoading(false);
      },
      err => {
        console.error('[PROFILE LOAD] Error:', err);
      }
    );

    return unsub;
  }, [email]);

  /* ---------------- SAVE FILTERS ---------------- */
  const saveFilters = async (updates: any) => {
    await setDoc(
      doc(firestore, 'users', email),
      { filters: updates },
      { merge: true }
    );
  };

  /* ---------------- INTERESTS ---------------- */
  const toggleInterest = async (interest: string) => {
    const updated = interests.includes(interest)
      ? interests.filter(i => i !== interest)
      : [...interests, interest];

    setInterests(updated);

    await setDoc(
      doc(firestore, 'users', email),
      { interests: updated },
      { merge: true }
    );
  };

  /* ---------------- RADIUS ---------------- */
  const updateRadius = async (value: number) => {
    setRadiusMiles(value);
    await setDoc(
      doc(firestore, 'users', email),
      { searchRadiusMiles: value },
      { merge: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.hello}>hey {displayName}</Text>

      {/* INTERESTS */}
      <Text style={styles.sectionTitle}>Your Interests</Text>
      {AVAILABLE_INTERESTS.map(i => (
        <TouchableOpacity
          key={i}
          style={[
            styles.interestButton,
            interests.includes(i) && styles.selected,
          ]}
          onPress={() => toggleInterest(i)}
        >
          <Text
            style={[
              styles.interestText,
              interests.includes(i) && { color: '#fff' },
            ]}
          >
            {i}
          </Text>
        </TouchableOpacity>
      ))}

      {/* DISTANCE */}
      <Text style={styles.sectionTitle}>Search Distance</Text>
      <Text style={styles.distanceText}>{radiusMiles} miles</Text>

      <Slider
        minimumValue={1}
        maximumValue={20}
        step={1}
        value={radiusMiles}
        onSlidingComplete={updateRadius}
        minimumTrackTintColor="#E10044"
        thumbTintColor="#E10044"
      />

      {/* 🔥 PREMIUM FILTERS */}
      {isPremium && (
        <>
          <Text style={styles.sectionTitle}>Premium Filters</Text>

          {/* PRICE */}
          <View style={styles.row}>
            {[1, 2, 3, 4].map(p => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  maxPriceLevel === p && styles.chipActive,
                ]}
                onPress={() => {
                  const val = maxPriceLevel === p ? null : p;
                  setMaxPriceLevel(val);
                  saveFilters({
                    maxPriceLevel: val,
                    minRating,
                    openNowOnly,
                  });
                }}
              >
                <Text style={styles.chipText}>{'$'.repeat(p)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* RATING */}
          <View style={styles.row}>
            {[3.5, 4, 4.5].map(r => (
              <TouchableOpacity
                key={r}
                style={[
                  styles.chip,
                  minRating === r && styles.chipActive,
                ]}
                onPress={() => {
                  const val = minRating === r ? null : r;
                  setMinRating(val);
                  saveFilters({
                    maxPriceLevel,
                    minRating: val,
                    openNowOnly,
                  });
                }}
              >
                <Text style={styles.chipText}>⭐ {r}+</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* OPEN NOW */}
          <View style={styles.switchRow}>
            <Text style={{ fontWeight: '600' }}>Open now only</Text>
            <Switch
              value={openNowOnly}
              onValueChange={v => {
                setOpenNowOnly(v);
                saveFilters({
                  maxPriceLevel,
                  minRating,
                  openNowOnly: v,
                });
              }}
            />
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hello: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },

  sectionTitle: { fontSize: 18, fontWeight: '600', marginTop: 24 },

  distanceText: { color: '#E10044', marginBottom: 10 },

  interestButton: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 10,
  },
  selected: { backgroundColor: '#E10044', borderColor: '#E10044' },
  interestText: { color: '#E10044', fontWeight: '500' },

  row: { flexDirection: 'row', gap: 8, marginTop: 10 },

  chip: {
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  chipActive: { backgroundColor: '#fcadad', color: '#ccc' },
  chipText: { color: '#E10044', fontWeight: '600' },

  switchRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    color: '#E10044',
  },
});
