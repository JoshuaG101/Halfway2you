import React, {
  useMemo,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  PanResponder,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Place, UserLocation } from '../type';
import { Image } from 'react-native';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MIN_HEIGHT = SCREEN_HEIGHT * 0.3;
const MAX_HEIGHT = SCREEN_HEIGHT * 0.8;

type Props = {
  userLocation: { latitude: number; longitude: number };
  places: Place[];
  groupLocations: UserLocation[];
  isInGroup: boolean;
};

export type MapBottomSheetRef = {
  scrollToPlace: (placeId: string) => void;
};

/* Open native navigation */
function openInMaps(lat: number, lng: number, label?: string) {
  const encodedLabel = label ? encodeURIComponent(label) : 'Destination';
  const url =
    Platform.OS === 'ios'
      ? `http://maps.apple.com/?ll=${lat},${lng}&q=${encodedLabel}`
      : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  Linking.openURL(url).catch(err =>
    console.error('Failed to open maps:', err)
  );
}

/* Distance in miles */
function getDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default forwardRef<MapBottomSheetRef, Props>(function MapBottomSheet(
  { userLocation, places },
  ref
) {
  const heightAnim = useRef(new Animated.Value(MIN_HEIGHT)).current;
  const currentHeight = useRef(MIN_HEIGHT);
  const listRef = useRef<FlatList>(null);
  const [highlightedPlace, setHighlightedPlace] = useState<string | null>(null);

  /* Expose scrollToPlace */
  useImperativeHandle(ref, () => ({
    scrollToPlace(placeId: string) {
      const index = places.findIndex(p => p.id === placeId);
      if (index >= 0 && listRef.current) {
        listRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5,
        });
        setHighlightedPlace(placeId);
      }
    },
  }));

  /* Drag to resize */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        let newHeight = currentHeight.current - gesture.dy;
        newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
        heightAnim.setValue(newHeight);
      },
      onPanResponderRelease: (_, gesture) => {
        let newHeight = currentHeight.current - gesture.dy;
        currentHeight.current = Math.max(
          MIN_HEIGHT,
          Math.min(MAX_HEIGHT, newHeight)
        );
      },
    })
  ).current;

  /* Sort by distance */
  const closestPlaces = useMemo(() => {
    return [...places]
      .map(p => ({
        ...p,
        distance: getDistanceMiles(
          userLocation.latitude,
          userLocation.longitude,
          p.latitude,
          p.longitude
        ),
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [places, userLocation]);

  const hasNoLocations = closestPlaces.length === 0;

  return (
    <Animated.View style={[styles.container, { height: heightAnim }]}>
      {/* Drag Handle */}
      <View style={styles.dragArea} {...panResponder.panHandlers}>
        <View style={styles.dragHandle} />
      </View>

      {/* Banner */}
      <View style={styles.adBanner}>
        <Text style={styles.adText}>Banner Ad Placeholder</Text>
      </View>

      {hasNoLocations ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No locations found</Text>
          <Text style={styles.emptySubtitle}>
            Please add interests to see nearby places.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={closestPlaces}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 16 }}
          renderItem={({ item }) => (
            <View>
              <View
                style={[
                  styles.locationCard,
                  highlightedPlace === item.id && styles.highlightedCard,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationName}>{item.name}</Text>
                  <Text style={styles.locationDistance}>
                    {item.distance.toFixed(1)} mi
                  </Text>

                  {item.details && (
                    <>
                      {item.details.rating && (
                        <View style={styles.ratingRow}>
                          <Image
                            source={require('../assets/images/star.png')}
                            style={styles.starIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.ratingText}>
                            {item.details.rating} (
                            {item.details.user_ratings_total})
                          </Text>
                        </View>
                      )}

                      {item.details.price_level != null && (
                        <Text>
                          Price: {'$'.repeat(item.details.price_level)}
                        </Text>
                      )}

                      {item.details.opening_hours?.open_now != null && (
                        <View style={styles.openStatus}>
                          <Image
                            source={
                              item.details.opening_hours.open_now
                                ? require('../assets/images/open.png')
                                : require('../assets/images/closed.png')
                            }
                            style={styles.openStatusIcon}
                            resizeMode="contain"
                          />
                          <Text style={styles.openStatusText}>
                            {item.details.opening_hours.open_now
                              ? 'Open'
                              : 'Closed'}
                          </Text>
                        </View>
                      )}

                      {item.details.formatted_address && (
                        <Text style={{ opacity: 0.6 }}>
                          {item.details.formatted_address}
                        </Text>
                      )}
                    </>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.navigateButton}
                  onPress={() =>
                    openInMaps(item.latitude, item.longitude, item.name)
                  }
                >
                  <Text style={styles.navigateButtonText}>Go</Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  height: 0.5,
                  backgroundColor: '#ccc',
                  marginVertical: 6,
                }}
              />
            </View>
          )}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    paddingHorizontal: 16,
  },
  dragArea: { paddingBottom: 12 },
  dragHandle: {
    width: 50,
    height: 5,
    backgroundColor: '#E10044',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 10,
  },
  adBanner: {
    backgroundColor: '#E10044',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 12,
  },
  adText: { color: '#ffffff', fontWeight: 'bold' },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
  },
  highlightedCard: { backgroundColor: '#ffffff' },
  locationName: { fontWeight: '600', fontSize: 14 },
  locationDistance: { fontSize: 12, color: '#E10044', marginBottom: 4 },
  navigateButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  navigateButtonText: {
    color: '#E10044',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  openStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  openStatusIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  openStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  starIcon: {
    width: 14,
    height: 14,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
