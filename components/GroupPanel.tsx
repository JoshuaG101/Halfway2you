import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Animated,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Group } from '../type';
import InviteButton from './InviteButton';
import { firestore } from '../FirebaseConfig';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  arrayUnion,
  deleteDoc,
} from 'firebase/firestore';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  groups: Group[];
  activeGroup: Group | null;
  setActiveGroup: (g: Group) => void;
  CURRENT_USER: string;
  groupsOpen: boolean;
  groupMode: 'menu' | 'create' | 'join';
  setGroupMode: (mode: 'menu' | 'create' | 'join') => void;
  groupName: string;
  setGroupName: (name: string) => void;
};

export default function GroupPanel({
  groups,
  activeGroup,
  setActiveGroup,
  CURRENT_USER,
  groupsOpen,
  groupMode,
  setGroupMode,
  groupName,
  setGroupName,
}: Props) {
  const height = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(height, {
        toValue: groupsOpen ? 320 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: groupsOpen ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (!groupsOpen) setGroupMode('menu');
    });
  }, [groupsOpen]);

  // ➕ CREATE GROUP (AUTO-JOIN CREATOR)
  const createGroup = async () => {
    if (!groupName.trim()) return;

    try {
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
      setGroupMode('menu');
    } catch {
      Alert.alert('Error', 'Failed to create group');
    }
  };

  // 🔑 JOIN BY INVITE CODE
  const joinByInviteCode = async () => {
    if (!inviteCode.trim()) return;

    try {
      const inviteRef = doc(firestore, 'invites', inviteCode.trim());
      const snap = await getDoc(inviteRef);

      if (!snap.exists()) {
        Alert.alert('Invalid Code', 'Invite code not found');
        return;
      }

      const { groupId } = snap.data();

      await updateDoc(doc(firestore, 'groups', groupId), {
        members: arrayUnion(CURRENT_USER),
      });

      await setDoc(
        doc(firestore, 'users', CURRENT_USER),
        { groups: arrayUnion(groupId) },
        { merge: true }
      );

      await deleteDoc(inviteRef);

      setInviteCode('');
      setGroupMode('menu');
      Alert.alert('Success', 'You joined the group!');
    } catch {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  return (
    <Animated.View
      pointerEvents={groupsOpen ? 'auto' : 'none'}
      style={[
        styles.container,
        { height, opacity, padding: groupsOpen ? 12 : 0 },
      ]}
    >
      {/* 🧭 GROUP LIST */}
      {groups.length > 0 && groupMode === 'menu' && (
        <ScrollView style={{ maxHeight: 140 }}>
          {groups.map(g => (
            <TouchableOpacity
              key={g.id}
              style={[
                styles.groupItem,
                g.id === activeGroup?.id && styles.activeGroup,
              ]}
              onPress={() => setActiveGroup(g)}
            >
              <Text style={styles.groupName}>{g.name}</Text>
              <Text style={styles.memberCount}>
                {g.members.length} members
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* 🎯 ACTIVE GROUP ACTIONS */}
      {activeGroup && groupMode === 'menu' && (
        <>
          <InviteButton groupId={activeGroup.id} />
        </>
      )}

      {/* 🧩 MENU */}
      {groupMode === 'menu' && (
        <>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setGroupMode('create')}
          >
            <Text style={styles.primaryButtonText}>➕ Create Group</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setGroupMode('join')}
          >
            <Text style={styles.secondaryButtonText}>🔑 Join with Code</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ➕ CREATE */}
      {groupMode === 'create' && (
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

      {/* 🔑 JOIN */}
      {groupMode === 'join' && (
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: 14,
    right: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    zIndex: 20,
    overflow: 'hidden',
  },

  groupItem: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f6f6f6',
    marginBottom: 8,
  },

  activeGroup: {
    backgroundColor: '#ffffff',
  },

  groupName: {
    fontWeight: 'bold',
    fontSize: 14,
  },

  memberCount: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },

  primaryButton: {
    backgroundColor: '#E10044',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  secondaryButton: {
    backgroundColor: '#E10044',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
});
