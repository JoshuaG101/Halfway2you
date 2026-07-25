import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { auth, firestore } from '../../FirebaseConfig';
import { collection, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

type Group = {
  id: string;
  name: string;
  members: string[];
};

type FakeUser = {
  id: string;
  interests: string[];
  location: { lat: number; lng: number };
  createdAt: number;
};

export default function GroupsTab() {
  const email = auth.currentUser?.email!;
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [fakeUsers, setFakeUsers] = useState<FakeUser[]>([]);
  const [fakeUserInterests, setFakeUserInterests] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  /* ---------------- LOCATION ---------------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission required');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      setUserLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    })();
  }, []);

  /* ---------------- LOAD GROUPS ---------------- */
  useEffect(() => {
    if (!email) return;

    const unsub = onSnapshot(doc(firestore, 'users', email), async snap => {
      const ids: string[] = snap.data()?.groups || [];
      if (!ids.length) return setGroups([]);

      const results = await Promise.all(
        ids.map(id => getDoc(doc(firestore, 'groups', id)))
      );

      setGroups(
        results
          .filter(d => d.exists())
          .map(d => ({ id: d.id, ...(d.data() as Omit<Group, 'id'>) }))
      );
    });

    return unsub;
  }, [email]);

  /* ---------------- LOAD FAKE USERS ---------------- */
  useEffect(() => {
    if (!selectedGroup) return;

    const ref = collection(firestore, 'groups', selectedGroup.id, 'fakeUsers');
    const unsub = onSnapshot(ref, snap => {
      const data: FakeUser[] = [];
      snap.forEach(d => {
        const v = d.data() as any;
        data.push({
          id: d.id,
          interests: v.interests,
          location: v.location,
          createdAt: v.createdAt,
        });
      });
      setFakeUsers(data);
    });

    return unsub;
  }, [selectedGroup]);

  /* ---------------- CREATE FAKE USER ---------------- */
  const createFakeUser = async () => {
    if (!selectedGroup) return Alert.alert('Select a group first');
    if (!fakeUserInterests.trim()) return Alert.alert('Enter at least one interest');
    if (!userLocation) return Alert.alert('Location unavailable');

    await setDoc(
      doc(
        firestore,
        'groups',
        selectedGroup.id,
        'fakeUsers',
        uuidv4()
      ),
      {
        interests: fakeUserInterests.split(',').map(i => i.trim()),
        location: userLocation,
        createdAt: Date.now(),
      }
    );

    setFakeUserInterests('');
  };

  /* ---------------- UPDATE LOCATION ---------------- */
  const moveToMyLocation = async (fakeUser: FakeUser) => {
    if (!selectedGroup || !userLocation) return;

    await setDoc(
      doc(
        firestore,
        'groups',
        selectedGroup.id,
        'fakeUsers',
        fakeUser.id
      ),
      { location: userLocation },
      { merge: true }
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Groups</Text>

      {/* GROUPS */}
      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.groupCard,
              selectedGroup?.id === item.id && styles.groupActive,
            ]}
            onPress={() => setSelectedGroup(item)}
          >
            <Text
              style={[
                styles.groupText,
                selectedGroup?.id === item.id && { color: '#fff' },
              ]}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* SELECTED GROUP */}
      {selectedGroup && (
        <>
          <Text style={styles.sectionTitle}>
            Users in {selectedGroup.name}
          </Text>

          {fakeUsers.map(f => (
            <View key={f.id} style={styles.card}>
              <View style={styles.chipRow}>
                {f.interests.map(i => (
                  <View key={i} style={styles.chip}>
                    <Text style={styles.chipText}>{i}</Text>
                  </View>
                ))}
              </View>

              <Text style={styles.locationText}>
                {f.location.lat.toFixed(4)}, {f.location.lng.toFixed(4)}
              </Text>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => moveToMyLocation(f)}
              >
                <Text style={styles.secondaryText}>
                  Set to My Location
                </Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* CREATE */}
          <Text style={styles.sectionTitle}>Create Fake User</Text>

          <TextInput
            placeholder="Interests (comma separated)"
            value={fakeUserInterests}
            onChangeText={setFakeUserInterests}
            style={styles.input}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={createFakeUser}
          >
            <Text style={styles.primaryText}>Create Fake User</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 10,
  },

  /* GROUPS */
  groupCard: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 10,
  },
  groupActive: {
    backgroundColor: '#E10044',
    borderColor: '#E10044',
  },
  groupText: {
    fontWeight: '600',
    color: '#E10044',
  },

  /* CARDS */
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#fcadad',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipText: {
    fontWeight: '600',
    color: '#E10044',
  },

  locationText: {
    color: '#555',
    marginBottom: 10,
  },

  /* BUTTONS */
  primaryButton: {
    backgroundColor: '#E10044',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E10044',
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#E10044',
    fontWeight: '600',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
});