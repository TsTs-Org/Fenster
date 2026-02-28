/**
 * Calculates zoom level based on altitude (meters)
 * @param {number} height - Altitude in meters
 * @param {number} lat - Latitude of the map center
 * @returns {number} - Calculated zoom level (0-21)
 */
function getZoomFromHeight(height: number, lat = 40.7128): number{
    // Constant for Earth's circumference at equator (~40,075,016 meters)
    const earthCircumference = 40075016;

    // Adjust for latitude (cosine of lat in radians)
    const adjustedCircumference =
        earthCircumference * Math.cos((lat * Math.PI) / 180);

    // zoom = log2(Circumference / height)
    // We subtract a small factor (e.g., 8) to align 'height' with 'viewable span'
    let zoom = Math.log2(adjustedCircumference / height) - 8;

    // Google Maps Static API limits zoom between 0 and 21
    return Math.min(Math.max(Math.round(zoom), 0), 21);
}

export function getMapUrl(lat: number, lng: number, height: number, apiKey: string, map_size: number): string {
    const zoom = getZoomFromHeight(height, lat);
    // The scale=2 parameter doubles the resolution (number of pixels).
    // Note: Standard API limit for 'size' is 640x640. With scale=2, you get 1280x1280 pixels.
    const constrainedSize = Math.min(map_size, 640);
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${constrainedSize}x${constrainedSize}&scale=2&maptype=satellite&key=${apiKey}`;
}