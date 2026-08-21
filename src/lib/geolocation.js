// Wraps the browser Geolocation API in a promise. No Google API key needed —
// this is the device's own location service. Google Places Autocomplete (for
// typing an address you're not physically at) is a separate future upgrade
// that layers on top of the same latitude/longitude fields.
export function captureLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location is not available on this device'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (error) => {
        if (error.code === error.PERMISSION_DENIED) reject(new Error('Location permission denied'))
        else reject(new Error('Could not get your location'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })
}
