"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROOT_COORDINATE = void 0;
exports.rootFromProfile = rootFromProfile;
exports.distanceFromRoot = distanceFromRoot;
exports.sortByRootDistance = sortByRootDistance;
const geolib_1 = require("geolib");
exports.ROOT_COORDINATE = {
    latitude: 16.068,
    longitude: 108.2297,
};
function rootFromProfile(profile) {
    if (profile && profile.rootLatitude != null && profile.rootLongitude != null) {
        return { latitude: profile.rootLatitude, longitude: profile.rootLongitude };
    }
    return undefined;
}
function distanceFromRoot(latitude, longitude, root = exports.ROOT_COORDINATE) {
    if (latitude == null || longitude == null)
        return Number.POSITIVE_INFINITY;
    return (0, geolib_1.getDistance)({ latitude, longitude }, { latitude: root.latitude, longitude: root.longitude });
}
function sortByRootDistance(bookings, root = exports.ROOT_COORDINATE) {
    return [...bookings].sort((a, b) => distanceFromRoot(a.latitude, a.longitude, root) -
        distanceFromRoot(b.latitude, b.longitude, root));
}
//# sourceMappingURL=distance.js.map