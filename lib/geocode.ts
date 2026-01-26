export async function geocodePincode(pincode: string) {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error("Missing Google Maps API key");

    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${pincode}&key=${apiKey}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "OVER_QUERY_LIMIT") {
      return { error: "GOOGLE_LIMIT_EXCEEDED" };
    }

    if (data.status !== "OK") {
      return { error: `GEOCODE_FAILED: ${data.status}` };
    }

    const loc = data.results[0].geometry.location;
    return { lat: loc.lat, lng: loc.lng };
  } catch (err) {
    console.error("geocode error:", err);
    return { error: "FAILED" };
  }
}
