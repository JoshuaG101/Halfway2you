import React from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { UserLocation, Place } from '../type';
import { firestore } from '../FirebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

type Props = {
  groupLocations: UserLocation[];
  fakeUsers: UserLocation[];
  places: Place[];
  midpoint: { latitude: number; longitude: number } | null;
  CURRENT_USER: string;
  activeGroupId?: string;
  onPlacePress?: (placeId: string) => void;
};

const getPlaceIcon = (type?: string) => {
  switch (type) {
    case 'cafe':
      return require('../assets/icons/coffee.png');
    case 'restaurant':
      return require('../assets/icons/food.png');
    case 'park':
      return require('../assets/icons/tree.png');
    case 'bar':
      return require('../assets/icons/drink.png');
    default:
      return require('../assets/images/location.png');
  }
};

export default function MapMarkers({
  groupLocations,
  fakeUsers,
  places,
  midpoint,
  activeGroupId,
  onPlacePress,
}: Props) {
  return (
    <>
      {/* Real users */}
      {groupLocations.map(u => (
        <Marker
          key={u.uid}
          coordinate={{ latitude: u.lat, longitude: u.lng }}
        >
          <Image
            source={require('../assets/images/friends.png')}
            style={styles.userIcon}
          />
        </Marker>
      ))}

      {/* Fake users */}
      {fakeUsers.map(u => (
        <Marker
          key={u.uid}
          coordinate={{ latitude: u.lat, longitude: u.lng }}
          draggable
          onDragEnd={async e => {
            if (!activeGroupId) return;
            const { latitude, longitude } = e.nativeEvent.coordinate;
            await setDoc(
              doc(firestore, 'groups', activeGroupId, 'fakeUsers', u.uid),
              { location: { lat: latitude, lng: longitude } },
              { merge: true }
            );
          }}
        >
          <Image
            source={require('../assets/images/friends.png')}
            style={styles.userIcon}
          />
        </Marker>
      ))}

      {/* Midpoint */}
      {midpoint && (
        <Marker coordinate={midpoint}>
          <Image
            source={require('../assets/images/location.png')}
            style={styles.midpointIcon}
          />
        </Marker>
      )}

      {/* Places */}
      {places.map(p => {
        const rating = p.details?.rating;

        return (
          <Marker
            key={p.id}
            coordinate={{
              latitude: p.latitude,
              longitude: p.longitude,
            }}
            onPress={() => onPlacePress?.(p.id)}
          >
            {/* Icon bubble */}
            <View style={styles.placeMarker}>
              <Image
                source={getPlaceIcon(p.type)}
                style={styles.placeIcon}
              />
            </View>

            {/* Callout */}
            <Callout tooltip={Platform.OS === 'ios'}>
              <View style={styles.callout}>
                <Text style={styles.placeName}>{p.name}</Text>
                {rating != null && (
                  <Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
                )}
              </View>
            </Callout>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  userIcon: {
    width: 32,
    height: 32,
  },
  midpointIcon: {
    width: 36,
    height: 36,
  },
  placeMarker: {
    backgroundColor: '#ffffff',
    borderColor: '#222222',
    borderWidth: 1.5,
    padding: 4,
    borderRadius: 40,
    elevation: 4,
  },
  placeIcon: {
    width: 20,
    height: 20,
  },
  callout: {
    backgroundColor: '#000000',
    padding: 8,
    borderRadius: 8,
    minWidth: 120,
  },
  placeName: {
    fontSize: 13,
    fontWeight: '600',
  },
  rating: {
    fontSize: 12,
    marginTop: 2,
  },
});