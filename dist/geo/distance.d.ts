export interface RootCoordinate {
    latitude: number;
    longitude: number;
}
export declare const ROOT_COORDINATE: RootCoordinate;
export declare function rootFromProfile(profile?: {
    rootLatitude?: number | null;
    rootLongitude?: number | null;
} | null): RootCoordinate | undefined;
export declare function distanceFromRoot(latitude?: number | null, longitude?: number | null, root?: RootCoordinate): number;
export declare function sortByRootDistance<T extends {
    latitude?: number | null;
    longitude?: number | null;
}>(bookings: T[], root?: RootCoordinate): T[];
