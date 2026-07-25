import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';
import { auth, firestore } from '../../FirebaseConfig';
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  setDoc,
} from 'firebase/firestore';
import Animated, {
  Layout,
  SlideInRight,
  SlideOutLeft,
} from 'react-native-reanimated';

import TopBar from '../../components/TopBar';
import GroupPanel from '../../components/GroupPanel';
import MapBottomSheet, {
  MapBottomSheetRef,
} from '../../components/MapBottomSheet';
import MapMarkers from '../../components/MapMarkers';
import { Group, UserLocation, Place } from '../../type';
import { Ionicons } from '@expo/vector-icons';

const GOOGLE_PLACES_API_KEY =   process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export default function UnifiedMapScreen() {
  const user = auth.currentUser;
  if (!user?.email) {
    return (
      <View style={styles.center}>
        <Text>Please log in</Text>
      </View>
    );
  }

  const CURRENT_USER = user.email;
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<MapBottomSheetRef>(null);

  const [userLocation, setUserLocation] =
    useState<{ latitude: number; longitude: number } | null>(null);

  const [interests, setInterests] = useState<string[]>([]);
  const [radiusMiles, setRadiusMiles] = useState(5);
  const [isPremium, setIsPremium] = useState(false);

  // 🔥 Premium filters


  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const [groupLocations, setGroupLocations] = useState<UserLocation[]>([]);
  const [fakeUsers, setFakeUsers] = useState<UserLocation[]>([]);
  const [membersData, setMembersData] = useState<
    Record<string, { interests?: string[] }>
  >({});
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupsOpen, setGroupsOpen] = useState(false);
  const [groupMode, setGroupMode] =
    useState<'menu' | 'create' | 'join'>('menu');
  const [groupName, setGroupName] = useState('');

  /* ---------------- USER SETTINGS ---------------- */
  const [savedFilters, setSavedFilters] = useState<any>(null);

  
  useEffect(() => {
    console.log('[USER SNAPSHOT] Initializing listener for:', CURRENT_USER);
    return onSnapshot(
      doc(firestore, 'users', CURRENT_USER),
      snap => {
        console.log('[USER SNAPSHOT] Data updated:', snap.exists() ? snap.data() : 'not found');
        if (!snap.exists()) return;
        const d = snap.data();
        setInterests(d?.interests || []);
        setRadiusMiles(d?.searchRadiusMiles ?? 5);
        setIsPremium(!!d?.premium);
        setSavedFilters(d.filters || null);
      },
      err => {
        console.error('[USER SNAPSHOT] Error:', err);
      }
    );
  }, []);

  /* ---------------- USER GROUPS ---------------- */
  useEffect(() => {
    return onSnapshot(
      doc(firestore, 'users', CURRENT_USER),
      async snap => {
        console.log('[USER GROUPS SNAPSHOT] Loaded groups list:', snap.data()?.groups);
        const groupIds: string[] = snap.data()?.groups || [];
        if (!groupIds.length) {
          setGroups([]);
          setActiveGroup(null);
          setLoading(false);
          return;
        }

        try {
          const results = await Promise.all(
            groupIds.map(id => getDoc(doc(firestore, 'groups', id)))
          );

          const joined = results
            .filter(d => d.exists())
            .map(d => ({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }));

          console.log('[USER GROUPS SNAPSHOT] Loaded groups details:', joined);
          setGroups(joined);
          setActiveGroup(prev =>
            prev ? joined.find(g => g.id === prev.id) ?? joined[0] : joined[0]
          );
        } catch (err) {
          console.error('[USER GROUPS SNAPSHOT] Error loading group details:', err);
        }
        setLoading(false);
      },
      err => {
        console.error('[USER GROUPS SNAPSHOT] Error:', err);
      }
    );
  }, []);

  /* ---------------- GROUP MEMBERS + FAKE USERS ---------------- */
  useEffect(() => {
    if (!activeGroup) {
      setGroupLocations([]);
      setFakeUsers([]);
      setMembersData({});
      return;
    }

    const memberUnsubs = activeGroup.members.map(uid =>
      onSnapshot(
        doc(firestore, 'users', uid),
        snap => {
          console.log('[MEMBER SNAPSHOT] Loaded member data:', uid, snap.exists() ? snap.data() : 'not found');
          if (!snap.exists()) return;
          const d = snap.data();
          if (d?.location) {
            setGroupLocations(prev => [
              ...prev.filter(p => p.uid !== uid),
              { uid, lat: d.location.lat, lng: d.location.lng },
            ]);
          }
          setMembersData(prev => ({
            ...prev,
            [uid]: { interests: d?.interests || [] },
          }));
        },
        err => {
          console.error('[MEMBER SNAPSHOT] Error loading member:', uid, err);
        }
      )
    );

    const fakeUnsub = onSnapshot(
      collection(firestore, 'groups', activeGroup.id, 'fakeUsers'),
      snap => {
        console.log('[FAKE USERS SNAPSHOT] Loaded count:', snap.docs.length);
        const arr: UserLocation[] = [];
        snap.docs.forEach(d => {
          const data = d.data();
          if (!data?.location) return;
          arr.push({ uid: d.id, lat: data.location.lat, lng: data.location.lng });
          setMembersData(prev => ({
            ...prev,
            [d.id]: { interests: data.interests || [] },
          }));
        });
        setFakeUsers(arr);
      },
      err => {
        console.error('[FAKE USERS SNAPSHOT] Error:', err);
      }
    );

    return () => {
      memberUnsubs.forEach(u => u());
      fakeUnsub();
    };
  }, [activeGroup]);

  /* ---------------- USER LOCATION ---------------- */
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location permission required');
          // Fallback to default location
          setUserLocation({ latitude: 25.6828023, longitude: -80.4253329 });
          return;
        }

        const pos = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setUserLocation(coords);
        await setDoc(
          doc(firestore, 'users', CURRENT_USER),
          { location: { lat: coords.latitude, lng: coords.longitude } },
          { merge: true }
        );
      } catch (error) {
        console.error('Location error:', error);
        // Hardcoded fallback location (e.g., user's profile location)
        setUserLocation({ latitude: 25.6828023, longitude: -80.4253329 });
      }
    })();
  }, []);

  /* ---------------- Recenter Map ---------------- */
  const recenterMap = () => {
  if (!userLocation || !mapRef.current) return;

  mapRef.current.animateToRegion(
    {
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    },
    600
  );
};

  /* ---------------- MIDPOINT ---------------- */
  const midpoint = useMemo(() => {
    const all = [...groupLocations, ...fakeUsers];
    if (!all.length) return null;
    return {
      latitude: all.reduce((s, p) => s + p.lat, 0) / all.length,
      longitude: all.reduce((s, p) => s + p.lng, 0) / all.length,
    };
  }, [groupLocations, fakeUsers]);

  /* ---------------- COMMON INTERESTS ---------------- */
  const commonInterests = useMemo(() => {
    const entries = Object.values(membersData);
    if (!entries.length) return [];
    return entries.reduce<string[]>(
      (acc, cur, i) =>
        i === 0 ? cur.interests || [] : acc.filter(x => cur.interests?.includes(x)),
      []
    );
  }, [membersData]);

  /* ---------------- FETCH PLACES ---------------- */
 useEffect(() => {
  const searchLocation = midpoint ?? userLocation;
  const searchInterests = commonInterests.length
    ? commonInterests
    : interests;

  console.log('[PLACES FETCH] Triggered. location:', searchLocation, 'interests:', searchInterests);

  if (!searchLocation || !searchInterests.length) {
    console.log('[PLACES FETCH] Skipped: location or interests missing');
    return;
  }

  (async () => {
    try {
      const all: Place[] = [];
      console.log('[PLACES FETCH] Fetching for interests:', searchInterests, 'at location:', searchLocation);

      for (const interest of searchInterests) {
        console.log(`[PLACES FETCH] Querying Google Places (New) for "${interest}"...`);
        const res = await axios.post(
          'https://places.googleapis.com/v1/places:searchNearby',
          {
            includedTypes: [interest],
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: {
                  latitude: searchLocation.latitude,
                  longitude: searchLocation.longitude,
                },
                radius: radiusMiles * 1609.34, // in meters
              },
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.types',
            },
          }
        );

        const placesList = res.data.places || [];
        console.log(`[PLACES FETCH] API response results count for "${interest}":`, placesList.length);

        const parsed = placesList
          .filter((p: any) => p.location?.latitude != null && p.location?.longitude != null)
          .map((p: any) => ({
            id: p.id,
            name: p.displayName?.text || 'Location',
            latitude: p.location.latitude,
            longitude: p.location.longitude,
            type: interest,
          }));

        all.push(...parsed);
      }

      console.log('[PLACES FETCH] Successfully fetched total places:', all.length);
      setPlaces(all);
    } catch (error: any) {
      console.error('[PLACES FETCH] Failed to fetch places:', error.response?.data || error.message);
    }
  })();
}, [
  midpoint,
  userLocation,
  commonInterests,
  interests,
  radiusMiles,
]);


  /* ---------------- PREMIUM: HYDRATE DETAILS ---------------- */
  useEffect(() => {
    if (!isPremium || !places.length) return;

    const missing = places.filter(p => !p.details);
    if (!missing.length) return;

    (async () => {
      try {
        const enriched = await Promise.all(
          missing.map(async p => {
            const res = await axios.get(
              `https://places.googleapis.com/v1/places/${p.id}`,
              {
                headers: {
                  'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
                  'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,currentOpeningHours,formattedAddress',
                },
              }
            );

            const data = res.data;
            const mapPriceLevel = (str?: string): number | undefined => {
              switch (str) {
                case 'PRICE_LEVEL_FREE': return 0;
                case 'PRICE_LEVEL_INEXPENSIVE': return 1;
                case 'PRICE_LEVEL_MODERATE': return 2;
                case 'PRICE_LEVEL_EXPENSIVE': return 3;
                case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
                default: return undefined;
              }
            };

            return {
              ...p,
              details: {
                rating: data.rating,
                user_ratings_total: data.userRatingCount,
                price_level: mapPriceLevel(data.priceLevel),
                opening_hours: data.currentOpeningHours ? {
                  open_now: data.currentOpeningHours.openNow,
                } : undefined,
                formatted_address: data.formattedAddress,
              },
            };
          })
        );

        setPlaces(prev =>
          prev.map(p => enriched.find(e => e.id === p.id) ?? p)
        );
      } catch (err: any) {
        console.error('[DETAILS HYDRATE] Failed to fetch details:', err.response?.data || err.message);
      }
    })();
  }, [isPremium, places]);

  /* ---------------- FILTERED PLACES ---------------- */
const filteredPlaces = useMemo(() => {
  if (!isPremium || !savedFilters) return places;

  return places.filter(p => {
    const d = p.details;
    if (!d) return true;

    if (
      savedFilters.maxPriceLevel != null &&
      d.price_level != null &&
      d.price_level > savedFilters.maxPriceLevel
    )
      return false;

    if (
      savedFilters.minRating != null &&
      d.rating != null &&
      d.rating < savedFilters.minRating
    )
      return false;

    if (
      savedFilters.openNowOnly &&
      d.opening_hours?.open_now === false
    )
      return false;

    return true;
  });
}, [places, isPremium, savedFilters]);


  /* ---------------- RENDER ---------------- */
  if (loading || !userLocation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Animated.View
      style={{ flex: 1 }}
      entering={SlideInRight}
      exiting={SlideOutLeft}
      layout={Layout.springify()}
    >
      <TopBar
        activeGroupName={activeGroup?.name}
        groupsOpen={groupsOpen}
        toggleGroups={() => setGroupsOpen(p => !p)}
      />

      <GroupPanel
        groups={groups}
        activeGroup={activeGroup}
        setActiveGroup={setActiveGroup}
        CURRENT_USER={CURRENT_USER}
        groupsOpen={groupsOpen}
        groupMode={groupMode}
        setGroupMode={setGroupMode}
        groupName={groupName}
        setGroupName={setGroupName}
      />

      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          <MapMarkers
            groupLocations={groupLocations}
            fakeUsers={fakeUsers}
            places={filteredPlaces}
            midpoint={midpoint}
            CURRENT_USER={CURRENT_USER}
            activeGroupId={activeGroup?.id}
          />
        </MapView>

      </View>

      {/* RECENTER BUTTON */}
      <TouchableOpacity
  style={styles.recenterButton}
  onPress={recenterMap}
>
  <Ionicons name="locate-outline" size={24} color="#E10044" />
</TouchableOpacity>

      <MapBottomSheet
        ref={bottomSheetRef}
        userLocation={userLocation}
        places={filteredPlaces}
        groupLocations={groupLocations}
        isInGroup={!!activeGroup}
      />
    </Animated.View>
  );
}

/* ---------------- FILTER CHIP ---------------- */
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterRow: {
    position: 'absolute',
    top: 90,
    left: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  chip: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    elevation: 4,
  },

  chipActive: {
    backgroundColor: '#E10044',
  },

  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },

  chipTextActive: {
    color: '#fff',
  },

  recenterButton: {
  position: 'absolute',
  right: 16,
  bottom: 280, // safely above bottom panel
  backgroundColor: '#fff',
  borderRadius: 30,
  padding: 12,
  elevation: 12,
  zIndex: 999, // iOS + Android
  color: '#E10044',

},
});
