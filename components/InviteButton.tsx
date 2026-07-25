import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share, Linking, Platform } from 'react-native';
import { firestore } from '../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../FirebaseConfig';
import * as Clipboard from 'expo-clipboard';

// Generate human-readable code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${segment()}-${segment()}`;
}

type Props = { groupId: string };

export default function InviteButton({ groupId }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const createInvite = async () => {
    const code = generateInviteCode();
    setInviteCode(code);

    const userEmail = auth.currentUser?.email;
    if (!userEmail) {
      Alert.alert('Error', 'User not logged in');
      return;
    }

    try {
      await setDoc(doc(firestore, 'invites', code), {
        groupId,
        createdBy: userEmail,
        createdAt: new Date(),
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to create invite');
    }

    return code;
  };

  const shareGeneric = async () => {
    const code = await createInvite();
    if (!code) return;

    await Share.share({
      message: `Join my group! Use this code: ${code}`,
    });
  };

  const shareWhatsApp = async (phoneNumber: string) => {
    const code = await createInvite();
    if (!code) return;

    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      `Join my group! Use this code: ${code}`
    )}`;

    if (await Linking.canOpenURL(url)) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'WhatsApp is not installed');
    }
  };

  const shareSMS = async (phoneNumber: string) => {
    const code = await createInvite();
    if (!code) return;

    const separator = Platform.OS === 'ios' ? '&' : '?';
    const url = `sms:${phoneNumber}${separator}body=${encodeURIComponent(
      `Join my group! Use this code: ${code}`
    )}`;

    Linking.openURL(url);
  };

  const shareEmail = async (emailAddress: string) => {
    const code = await createInvite();
    if (!code) return;

    const url = `mailto:${emailAddress}?subject=${encodeURIComponent(
      'Group Invite'
    )}&body=${encodeURIComponent(`Join my group! Use this code: ${code}`)}`;

    Linking.openURL(url);
  };

const copyToClipboard = async () => {
  const code = inviteCode || (await createInvite());
  if (!code) return;

  await Clipboard.setStringAsync(code);
  Alert.alert('Copied!', `Invite code ${code} copied to clipboard.`);
};


  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={shareGeneric}>
        <Text style={styles.buttonText}>Share Invite (Any App)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: 'center' },
  button: {
    backgroundColor: '#E10044',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  orText: { marginVertical: 8, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 8 },
  smallButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 12 },
  smallButtonText: { color: '#fff', fontWeight: 'bold' },
});
