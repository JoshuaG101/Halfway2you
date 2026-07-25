import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

type Props = {
  activeGroupName?: string;
  groupsOpen: boolean;
  toggleGroups: () => void;
};

export default function TopBar({ activeGroupName, groupsOpen, toggleGroups }: Props) {
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      <TouchableOpacity style={styles.groupsPill} onPress={toggleGroups}>
        <Text style={styles.groupsPillText}>{activeGroupName || 'My Interests'}</Text>
        <Ionicons
          name={groupsOpen ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#E10044"
        />
      </TouchableOpacity>

     {/* Right stack */}
<View style={styles.rightStack}>
{/* Settings */}
<TouchableOpacity
style={styles.profileIcon}
onPress={() => router.push('/tabs/setting')}
>
<Ionicons name="settings" size={28} color="#E10044" />
</TouchableOpacity>


{/* SMS */}
<TouchableOpacity
onPress={() => Linking.openURL('sms:')}
style={styles.smsButton}
>
<Ionicons name="call" size={22} color='#E10044' />
</TouchableOpacity>
</View>
</View>
);
}
const styles = StyleSheet.create({
topBar: {
position: 'absolute',
top: 30,
left: 14,
right: 14,
zIndex: 20,
flexDirection: 'row',
justifyContent: 'space-between',
},


groupsPill: {
width: Dimensions.get('window').width * 0.55,
backgroundColor: '#ffffff',
padding: 10,
borderRadius: 999,
flexDirection: 'row',
justifyContent: 'space-between',

  borderWidth: 1,
  borderColor: '#E10044',
},


groupsPillText: {
color: '#E10044',
fontWeight: 'bold',
},


rightStack: {
flexDirection: 'row',
alignItems: 'center',
},


profileIcon: {
backgroundColor: '#fff',
padding: 6,
borderRadius: 20,
},


smsButton: {
marginLeft: 8, // directly below settings
backgroundColor: '#fff',
padding: 6,
borderRadius: 20,
},
});