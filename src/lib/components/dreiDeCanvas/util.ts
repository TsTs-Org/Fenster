/**
 * Calculates zoom level based on altitude (meters)
 * @param {number} height - Altitude in meters
 * @param {number} lat - Latitude of the map center
 * @returns {number} - Calculated zoom level (0-21)
 */
export function getZoomFromHeight(height: number, lat = 40.7128): number {
    const earthCircumference = 40075016;
    const adjustedCircumference =
        earthCircumference * Math.cos((lat * Math.PI) / 180);
    let zoom = Math.log2(adjustedCircumference / height) - 8;
    return Math.min(Math.max(Math.round(zoom), 0), 21);
}

export function getMapUrl(lat: number, lng: number, height: number, apiKey: string, map_size: number): string {
    const zoom = getZoomFromHeight(height, lat);
    const constrainedSize = Math.min(map_size, 640);
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${constrainedSize}x${constrainedSize}&scale=2&maptype=satellite&key=${apiKey}`;
}

/**
 * Converts a local position on the 100x100 Three.js plane into real world lat/lng.
 *
 * The plane is 100x100, centered at (0,0), rotated to lie flat on XZ.
 * After rotation.x = -PI/2:
 *   local X → world X → longitude (east/west)
 *   local Y → world -Z → latitude (north/south)
 *
 * @param localX - x in the plane's local coordinate space
 * @param localY - y in the plane's local coordinate space
 * @param centerLat - Latitude of the map center
 * @param centerLng - Longitude of the map center
 * @param height - Height in meters used to derive zoom
 * @param planeSize - Size of the Three.js PlaneGeometry (default 100)
 */
export function planeToLatLng(
    localX: number,
    localY: number,
    centerLat: number,
    centerLng: number,
    height: number,
    planeSize: number = 100
): { lat: number; lng: number } {
    const zoom = getZoomFromHeight(height, centerLat);

    // Meters per pixel at this zoom level at this latitude
    const metersPerPixel = 156543.03392 * Math.cos(centerLat * Math.PI / 180) / Math.pow(2, zoom);

    // The constrained image size used in the API call
    const imageSizePixels = Math.min(2000, 640);

    // Total meters the map image covers
    const mapMeters = metersPerPixel * imageSizePixels;

    // localX and localY are in [-planeSize/2, +planeSize/2]
    const fracX = localX / planeSize;
    const fracY = localY / planeSize;

    const offsetMetersX = fracX * mapMeters;
    const offsetMetersY = fracY * mapMeters;

    // 1 degree of latitude ≈ 111,320 meters
    const latPerMeter = 1 / 111320;
    const lngPerMeter = 1 / (111320 * Math.cos(centerLat * Math.PI / 180));

    const resultLat = centerLat + offsetMetersY * latPerMeter;
    const resultLng = centerLng + offsetMetersX * lngPerMeter;

    return { lat: resultLat, lng: resultLng };
}