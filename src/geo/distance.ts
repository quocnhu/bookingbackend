import { getDistance } from 'geolib';

export interface RootCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Root coordinate mặc định (điểm xuất phát / depot) — fallback khi
 * Company Profile chưa cấu hình toạ độ gốc. Mặc định = trụ sở công ty
 * (88 Bạch Đằng, Hải Châu, Đà Nẵng). Giá trị thực lấy từ Company Profile.
 */
export const ROOT_COORDINATE: RootCoordinate = {
  latitude: 16.068,
  longitude: 108.2297,
};

/** Trích toạ độ gốc từ Company Profile (chỉ trả về khi đủ cả lat & lng). */
export function rootFromProfile(
  profile?: { rootLatitude?: number | null; rootLongitude?: number | null } | null,
): RootCoordinate | undefined {
  if (profile && profile.rootLatitude != null && profile.rootLongitude != null) {
    return { latitude: profile.rootLatitude, longitude: profile.rootLongitude };
  }
  return undefined;
}

/**
 * Khoảng cách (mét) từ booking tới root coordinate.
 * Truyền `root` để dùng toạ độ từ Company Profile; nếu bỏ trống dùng mặc định.
 * Bookings thiếu toạ độ được xếp cuối (Infinity) — không vỡ thứ tự.
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

/** Sắp xếp 1 danh sách booking theo khoảng cách tăng dần tới root (gần nhất lên đầu). */
export function sortByRootDistance<
  T extends { latitude?: number | null; longitude?: number | null },
>(bookings: T[], root: RootCoordinate = ROOT_COORDINATE): T[] {
  return [...bookings].sort(
    (a, b) =>
      distanceFromRoot(a.latitude, a.longitude, root) -
      distanceFromRoot(b.latitude, b.longitude, root),
  );
}