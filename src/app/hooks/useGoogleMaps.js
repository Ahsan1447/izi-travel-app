import { useRef, useEffect } from 'react';

const API_KEY = "AIzaSyCYPYRcmwn55zmHm0s-XJsLojbVOEN3kkc";

export function useGoogleMaps() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const directionsRendererRef = useRef(null);
  const directionsServiceRef = useRef(null);

  function loadGoogleMaps(key = API_KEY) {
    if (typeof window === "undefined") return Promise.resolve();
    if (window.google && window.google.maps) return Promise.resolve();
    if (window.__gmapsInitPromise) return window.__gmapsInitPromise;
    if (!key) {
      console.warn("Google Maps API key is not set. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or window.GOOGLE_MAPS_API_KEY.");
    }
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key || "")}&v=weekly`;
    window.__gmapsInitPromise = new Promise((resolve, reject) => {
      const existing = Array.from(document.getElementsByTagName("script")).find(s => s.src && s.src.startsWith("https://maps.googleapis.com/maps/api/js"));
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", (e) => reject(e));
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
    });
    return window.__gmapsInitPromise;
  }

  function clearMapArtifacts() {
    try {
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];
    } catch (_) {}
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null);
        directionsRendererRef.current = null;
      }
    } catch (_) {}
  }

  function createMarkerIcon(index, size = 36, options = { pinColor: "#D60D46", numberColor: "#0E5671", innerCircleColor: "red" }) {
    const { pinColor, numberColor, innerCircleColor } = options;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="${pinColor}" filter="url(#pinShadow${index})"/>
        <circle cx="18" cy="13" r="7" fill="${innerCircleColor}"/>
        <text x="18" y="17" font-size="10" font-weight="700" text-anchor="middle" fill="${numberColor}" font-family="Arial, sans-serif">${index}</text>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size),
    };
  }

  function createSingleMarkerIcon() {
    const size = 36;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadowSingle" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="#0E5671" filter="url(#pinShadowSingle)"/>
        <circle cx="18" cy="13" r="7" fill="red"/>
      </svg>`;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size),
    };
  }

  return {
    mapRef,
    mapInstanceRef,
    markersRef,
    directionsRendererRef,
    directionsServiceRef,
    loadGoogleMaps,
    clearMapArtifacts,
    createMarkerIcon,
    createSingleMarkerIcon
  };
}