import { getDistance } from 'geolib';

export interface RootCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Default root coordinate (departure point / depot) — fallback when the
 * Company Profile has not configured root coordinates. Default = company
 * headquarters (88 Bach Dang, Hai Chau, Da Nang). The real value comes from
 * the Company Profile.
 */
export const ROOT_COORDINATE: RootCoordinate = {
  latitude: 16.068,
  longitude: 108.2297,
};

/** Extracts the root coordinate from the Company Profile (only returned when both lat & lng exist). */
export function rootFromProfile(
  profile?: { rootLatitude?: number | null; rootLongitude?: number | null } | null,
): RootCoordinate | undefined {
  if (profile && profile.rootLatitude != null && profile.rootLongitude != null) {
    return { latitude: profile.rootLatitude, longitude: profile.rootLongitude };
  }
  return undefined;
}

/**
 * Distance (metres) from the booking to the root coordinate.
 * Pass `root` to use the coordinate from the Company Profile; if omitted the
 * default is used. Bookings without coordinates sort last (Infinity) — this
 * does not break the ordering.
 */
export function distanceFromRoot(
  latitude?: number | null,
  longitude?: number | null,
  root: RootCoordinate = ROOT_COORDINATE,
): number {
  if (latitude == null || longitude == null) return Number.POSITIVE_INFINITY;
  return getDistance(
    { latitude, longitude },
    { latitude: root.latitude, longitude: root.longitude },
  );
}

/** Sorts a list of bookings by ascending distance to the root (nearest first). */
export function sortByRootDistance<
  T extends { latitude?: number | null; longitude?: number | null },
>(bookings: T[], root: RootCoordinate = ROOT_COORDINATE): T[] {
  return [...bookings].sort(
    (a, b) =>
      distanceFromRoot(a.latitude, a.longitude, root) -
      distanceFromRoot(b.latitude, b.longitude, root),
  );
}