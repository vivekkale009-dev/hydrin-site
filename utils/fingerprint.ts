import Fingerprint2 from "fingerprintjs2";

export async function getFingerprint() {
  if (typeof window === "undefined") return "server";

  return new Promise((resolve) => {
    Fingerprint2.get((components) => {
      const fingerprint = Fingerprint2.x64hash128(
        components.map((c) => c.value).join(""),
        31
      );
      resolve(fingerprint);
    });
  });
}
