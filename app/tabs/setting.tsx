// setting.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { auth, firestore } from '../../FirebaseConfig';
import { signOut, deleteUser } from 'firebase/auth';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

type Group = {
  id: string;
  name: string;
  members: string[];
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const email = user?.email;

  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  // Premium animation modal
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Delete account modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteText, setDeleteText] = useState('');

  // Detect current group
  useEffect(() => {
    if (!email) return;

    const unsub = onSnapshot(collection(firestore, 'groups'), snap => {
      let found: Group | null = null;
      snap.forEach(docSnap => {
        const data = docSnap.data() as Omit<Group, 'id'>;
        if (data.members?.includes(email)) {
          found = { ...data, id: docSnap.id };
        }
      });
      setActiveGroup(found);
    });

    return unsub;
  }, [email]);

  // Enable premium (OPTION A)
  const enablePremium = async () => {
    if (!email) return;

    setShowPremiumModal(true);

    await updateDoc(doc(firestore, 'users', email), {
      premium: true,
    });

    // Auto-close animation
    setTimeout(() => {
      setShowPremiumModal(false);
    }, 2600);
  };

  // Sign out
  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!activeGroup || !email) return;

    Alert.alert('Leave Group', `Leave "${activeGroup.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await updateDoc(doc(firestore, 'groups', activeGroup.id), {
            members: activeGroup.members.filter(m => m !== email),
          });
        },
      },
    ]);
  };

  // Delete account
  const confirmDeleteAccount = async () => {
    if (deleteText !== 'DELETE') {
      Alert.alert('Incorrect word', 'You must type DELETE exactly.');
      return;
    }

    try {
      if (user) {
        await deleteUser(user);
        setShowDeleteModal(false);
        router.replace('/login');
      }
    } catch {
      Alert.alert(
        'Error',
        'You may need to re-login before deleting your account.'
      );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* ACCOUNT */}
        <Text style={styles.greeting}>
          Hey, {user?.displayName || 'User'} 👋
        </Text>
        <Text style={styles.email}>{email}</Text>

        {/* PREMIUM BUTTON */}
        <TouchableOpacity style={styles.premiumButton} onPress={enablePremium}>
          <Text style={styles.premiumText}>✨ Enable Premium Mode</Text>
        </TouchableOpacity>

        {/* GROUP */}
        {activeGroup && (
          <View style={styles.groupBox}>
            <Text style={styles.groupTitle}>Current Group</Text>
            <Text style={styles.groupName}>{activeGroup.name}</Text>

            <TouchableOpacity
              style={styles.leaveButton}
              onPress={handleLeaveGroup}
            >
              <Text style={styles.leaveText}>Leave Group</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SETTINGS */}
        <View style={styles.settingsBox}>
          <Text style={styles.settingItem}>🔸 Change Password</Text>
          <Text style={styles.settingItem}>🔸 Notification Preferences</Text>
          <Text style={styles.settingItem}>🔸 Privacy Settings</Text>

          <TouchableOpacity onPress={() => setShowDeleteModal(true)}>
            <Text style={[styles.settingItem, styles.deleteText]}>
              🔴 Delete Account
            </Text>
          </TouchableOpacity>
        </View>

        {/* SIGN OUT */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* PREMIUM ANIMATION MODAL */}
        <Modal visible={showPremiumModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.lottieBox}>
              <LottieView
                source={{
                  uri: 'https://lottie.host/embed/6b776f41-b6b6-4882-85c3-e89983774cbd/3pDBacQ8iW.lottie',
                }}
                autoPlay
                loop={false}
                style={{ width: 200, height: 200 }}
              />
              <Text style={styles.premiumCongrats}>
                Premium Activated 🎉
              </Text>
            </View>
          </View>
        </Modal>

        {/* DELETE ACCOUNT MODAL */}
        <Modal visible={showDeleteModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Delete Account</Text>
              <Text style={styles.modalText}>
                Type <Text style={{ fontWeight: 'bold' }}>DELETE</Text> to confirm.
              </Text>

              <TextInput
                style={styles.input}
                value={deleteText}
                onChangeText={setDeleteText}
                autoCapitalize="characters"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  onPress={() => {
                    setShowDeleteModal(false);
                    setDeleteText('');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={confirmDeleteAccount}>
                  <Text style={styles.confirmDeleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    backgroundColor: '#fdfdfd',
  },
  greeting: { fontSize: 24, fontWeight: 'bold', marginBottom: 6 },
  email: { fontSize: 16, color: '#555', marginBottom: 20 },

  premiumButton: {
    backgroundColor: '#E10044',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 16,
    marginBottom: 20,
  },
  premiumText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#fff',
  },

  groupBox: {
    width: '100%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  groupTitle: { fontWeight: '600', marginBottom: 4 },
  groupName: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },

  leaveButton: {
    backgroundColor: '#E10044',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  leaveText: { color: '#fff', fontWeight: 'bold' },

  settingsBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
  },
  settingItem: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deleteText: { color: '#E10044', fontWeight: 'bold' },

  signOutButton: {
    backgroundColor: '#E10044',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginBottom: 20,
  },
  signOutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  lottieBox: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
  },
  premiumCongrats: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: 'bold',
  },

  modalBox: {
    backgroundColor: '#fff',
    width: '85%',
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10 },
  modalText: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelText: { fontSize: 16 },
  confirmDeleteText: {
    fontSize: 16,
    color: '#E10044',
    fontWeight: 'bold',
  },
});
