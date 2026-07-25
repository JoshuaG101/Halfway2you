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
import { auth, firestore } from '../FirebaseConfig';
import {
  doc,
  onSnapshot,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

type Group = {
  id: string;
  name: string;
  members: string[];
};

export default function GroupsScreen() {
  const CURRENT_USER = auth.currentUser?.email!;
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // 🔄 LIVE LOAD USER GROUPS (FIXED)
  useEffect(() => {
    if (!CURRENT_USER) return;

    const unsub = onSnapshot(
      doc(firestore, 'users', CURRENT_USER),
      async snap => {
        const groupIds: string[] = snap.data()?.groups || [];

        if (groupIds.length === 0) {
          setGroups([]);
          return;
        }

        const results = await Promise.all(
          groupIds.map(id => getDoc(doc(firestore, 'groups', id)))
        );

        setGroups(
          results
            .filter(d => d.exists())
            .map(d => ({
              id: d.id,
              ...(d.data() as Omit<Group, 'id'>),
            }))
        );
      }
    );

    return unsub;
  }, []);

  // ➕ CREATE GROUP (FIXED)
  const createGroup = async () => {
    if (!groupName.trim()) return;

    const groupId = uuidv4();

    await setDoc(doc(firestore, 'groups', groupId), {
      name: groupName.trim(),
      members: [CURRENT_USER],
      createdAt: Date.now(),
    });

    await setDoc(
      doc(firestore, 'users', CURRENT_USER),
      { groups: arrayUnion(groupId) },
      { merge: true }
    );

    setGroupName('');
    setMode('menu');
  };

  // 🔑 JOIN BY INVITE CODE ONLY
  const joinByInviteCode = async () => {
    if (!inviteCode.trim()) return;

    try {
      const inviteRef = doc(firestore, 'invites', inviteCode.trim());
      const inviteSnap = await getDoc(inviteRef);

      if (!inviteSnap.exists()) {
        Alert.alert('Invalid Code', 'Invite code not found');
        return;
      }

      const { groupId } = inviteSnap.data();

      await updateDoc(doc(firestore, 'groups', groupId), {
        members: arrayUnion(CURRENT_USER),
      });

      await setDoc(
        doc(firestore, 'users', CURRENT_USER),
        { groups: arrayUnion(groupId) },
        { merge: true }
      );

      await deleteDoc(inviteRef);

      Alert.alert('Success', 'You joined the group!');
      setInviteCode('');
      setMode('menu');
    } catch {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Groups</Text>

      {/* 🔽 SCROLLABLE GROUP LIST (BOTTOM-SHEET STYLE) */}
      <View style={styles.groupsSheet}>
        <FlatList
          data={groups}
          keyExtractor={g => g.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.groupItem}>
              <Text style={styles.groupName}>{item.name}</Text>
              <Text style={styles.memberCount}>
                {item.members.length} members
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No groups yet</Text>
          }
        />
      </View>

      {mode === 'menu' && (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setMode('create')}
          >
            <Text style={styles.primaryButtonText}>➕ Create Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setMode('join')}
          >
            <Text style={styles.secondaryButtonText}>🔑 Join with Code</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'create' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            value={groupName}
            onChangeText={setGroupName}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={createGroup}
          >
            <Text style={styles.primaryButtonText}>Create</Text>
          </TouchableOpacity>
        </>
      )}

      {mode === 'join' && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Invite code"
            autoCapitalize="characters"
            value={inviteCode}
            onChangeText={setInviteCode}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={joinByInviteCode}
          >
            <Text style={styles.primaryButtonText}>Join</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 12 },

  groupsSheet: {
    maxHeight: 260,
    backgroundColor: '#f7f7f7',
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
  },

  groupItem: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },

  groupName: { fontSize: 16, fontWeight: 'bold' },
  memberCount: { fontSize: 12, color: '#666', marginTop: 4 },
  emptyText: { textAlign: 'center', color: '#777', marginTop: 20 },

  primaryButton: {
    backgroundColor: '#28a745',
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    alignItems: 'center',
  },

  primaryButtonText: { color: '#fff', fontWeight: 'bold' },

  secondaryButton: {
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    alignItems: 'center',
  },

  secondaryButtonText: { color: '#fff', fontWeight: 'bold' },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
});
