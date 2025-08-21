"use client"

import React, { useState, useRef, useEffect } from "react"

export default function SharedDetailsView({
  selectedChild,
  selectedItem,
  limitReached,
  markerNumber,
  selectionVersion = 0,
  showMapInPanel = false,
  mapOnly = false,
  onSelectMarker = () => {},
}) {
  const [isSatelliteView, setIsSatelliteView] = useState(false)
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersLayerRef = useRef(null)
  const tryCountRef = useRef(0)

  if (limitReached) return null
  if (!selectedChild && !selectedItem) return null

  // Prefer selectedChild location if available, otherwise fallback to selectedItem location
  const location =
    selectedChild?.location && selectedChild.location.latitude && selectedChild.location.longitude
      ? selectedChild.location
      : selectedItem?.location && selectedItem.location.latitude && selectedItem.location.longitude
      ? selectedItem.location
      : null

  const latitude = location?.latitude != null ? Number(location.latitude) : null
  const longitude = location?.longitude != null ? Number(location.longitude) : null

  const currentItem = selectedChild || selectedItem
  const itemTitle = currentItem.title
  const itemImage = currentItem.images?.[0]?.url
  const itemAudio = currentItem.content?.[0]?.audio?.[0]?.url
  const itemDescription = currentItem.description || ""
  const affiliateLink = selectedChild?.affiliateLink || selectedItem?.affiliateLink || ""

  const rawChildren = selectedItem?.content?.[0]?.children || []
  const contentList = rawChildren.filter((it) =>
    typeof it?.status === "string" ? it.status === "published" : true
  )

  const hasContentCoords = contentList.some((it) =>
    Number.isFinite(Number(it?.location?.latitude)) &&
    Number.isFinite(Number(it?.location?.longitude))
  )

  const hasCoords = (Number.isFinite(latitude) && Number.isFinite(longitude)) ||
                   hasContentCoords ||
                   (selectedChild &&
                    Number.isFinite(Number(selectedChild.location?.latitude)) &&
                    Number.isFinite(Number(selectedChild.location?.longitude)))

  const getPoints = () => {
    const content = selectedItem?.content?.[0] || {}
    const list = (content.children && content.children.length ? content.children : [])
      .filter((it) => (typeof it?.status === "string" ? it.status === "published" : true))
    return list
      .map((it, i) => ({
        lat: it?.location?.latitude != null ? Number(it.location.latitude) : null,
        lng: it?.location?.longitude != null ? Number(it.location.longitude) : null,
        title: it.title,
        uuid: it.uuid,
        index: i + 1,
        raw: it,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
  }

  // Create or recreate the Leaflet map instance. Extracted to a helper so we can force
  // a full recreate when selection changes (some Leaflet instances don't refresh layers
  // reliably otherwise).
  const createOrRecreateMap = () => {
    if (typeof window === 'undefined' || !mapRef.current || !window.L) return
    const L = window.L

    try {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove() } catch (_) {}
        mapInstanceRef.current = null
        markersLayerRef.current = null
      }

      const map = L.map(mapRef.current, { zoomControl: true, zoomAnimation: true })

      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      })
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      })
      osmLayer.addTo(map)

      mapInstanceRef.current = map
      markersLayerRef.current = L.layerGroup().addTo(map)

      const baseMaps = { Map: osmLayer, Satellite: satelliteLayer }
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map)

      try { map.setView([0, 0], 2) } catch (_) {}

      const ensureSized = (attempt = 0) => {
        try { map.invalidateSize() } catch (_) {}
        try {
          const size = map.getSize ? map.getSize() : { x: 0, y: 0 }
          if ((size.x === 0 || size.y === 0) && attempt < 8) {
            setTimeout(() => ensureSized(attempt + 1), 150)
            return
          }
        } catch (_) {}
        updateMarkers()
      }
      setTimeout(() => ensureSized(0), 150)
    } catch (_) {}
  }

  // Initialize leaflet only on client and when map is shown. Wait for the map container to exist
  // (mapRef.current) before attempting to load/initialize Leaflet. This ensures single child/reference
  // selections (where the container may appear only after state change) still initialize correctly.
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    let mounted = true

    function initMap() {
      if (!mapRef.current || !window.L) return

      const L = window.L

      // Remove existing map if it exists
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
      }

      // Create new map instance
      const map = L.map(mapRef.current, {
        zoomControl: true,
        zoomAnimation: true,
      })

      // Base layers
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      })
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      })
      osmLayer.addTo(map)

      mapInstanceRef.current = map
      markersLayerRef.current = L.layerGroup().addTo(map)

      // Set up layer control
      const baseMaps = { Map: osmLayer, Satellite: satelliteLayer }

      // Add layer control to map
      L.control.layers(baseMaps, null, { position: 'topright' }).addTo(map)

      // Set a default view so tiles start loading; later updates will adjust
      try { map.setView([0, 0], 2) } catch (_) {}

      // Ensure map size is calculated correctly
      const ensureSized = (attempt = 0) => {
        try { map.invalidateSize() } catch (_) {}
        try {
          const size = map.getSize ? map.getSize() : { x: 0, y: 0 }
          if ((size.x === 0 || size.y === 0) && attempt < 8) {
            setTimeout(() => ensureSized(attempt + 1), 150)
            return
          }
        } catch (_) {}
        updateMarkers()
      }
      setTimeout(() => ensureSized(0), 150)
    }

    const ensureContainerAndLoad = () => {
      if (!mounted) return
      if (!mapRef.current) {
        // Retry shortly until the container exists (it may be rendered after state change)
        setTimeout(ensureContainerAndLoad, 100)
        return
      }

      // Load leaflet css/script if not present
      if (typeof window !== 'undefined' && !window.L) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)

        const script = document.createElement('script')
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
        script.async = true
        script.onload = () => {
          setTimeout(initMap, 50)
        }
        document.body.appendChild(script)
      } else {
        // Ensure Leaflet CSS is present even if script is already loaded
        try {
          const hasLeafletCss = !!document.querySelector('link[href*="leaflet.css"]')
          if (!hasLeafletCss) {
            const link = document.createElement('link')
            link.rel = 'stylesheet'
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
            document.head.appendChild(link)
          }
        } catch (_) {}
        initMap()
      }
    }

    ensureContainerAndLoad()

    // Cleanup on unmount
    return () => {
      mounted = false
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove()
        } catch (_) {}
        mapInstanceRef.current = null
        markersLayerRef.current = null
      }
    }
  }, [mapOnly, showMapInPanel, selectionVersion])

  // If selected item/child changes while the map is mounted, ensure the map updates.
  // Some browsers / Leaflet instances may not update layers properly when props change,
  // so recreate the map if it's missing, otherwise refresh markers.
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    // Recreate map only when parent selection changes; for child selection, just update markers
    try {
      createOrRecreateMap()
    } catch (_) {
      // fallback: attempt to update markers
      setTimeout(() => {
        try { updateMarkers() } catch (_) {}
      }, 50)
    }
  }, [selectedItem?.uuid, selectionVersion])

  // Update markers when selectedItem or selectedChild changes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    updateMarkers()
  }, [selectedItem, selectedChild, selectionVersion])

  // Ensure map shows and updates when a child is selected: if map not ready, create it; otherwise update markers
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    if (!selectedChild) return
    if (!mapInstanceRef.current) {
      try { createOrRecreateMap() } catch (_) {}
    } else {
      try { updateMarkers() } catch (_) {}
    }
  }, [selectedChild?.uuid])

  const updateMarkers = () => {
    const L = window.L
    const map = mapInstanceRef.current
    const layer = markersLayerRef.current

    if (!map || !layer || !L) return

    // Ensure Leaflet knows the correct container size
    try {
      map.invalidateSize()
    } catch (_) {}

    // Clear existing markers
    layer.clearLayers()

    // Get all points (children/references)
    const points = getPoints()

    // If no points available from parent but selected child has coordinates, show that single child marker in gray
    const childHasCoords = selectedChild &&
      Number.isFinite(Number(selectedChild.location?.latitude)) &&
      Number.isFinite(Number(selectedChild.location?.longitude))

    if (!points.length && childHasCoords) {
      const lat = Number(selectedChild.location.latitude)
      const lng = Number(selectedChild.location.longitude)
      const createPinHtml = (index, size = 36, pinColor = 'red', numberColor = '#ffffff') => `
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pinShadowSingle" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
            </filter>
          </defs>
          <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="${pinColor}" filter="url(#pinShadowSingle)"/>
          <circle cx="18" cy="13" r="7" fill="red"/>
          <text x="18" y="17" font-size="10" font-weight="700" text-anchor="middle" fill="${numberColor}" font-family="Arial, sans-serif">1</text>
        </svg>`

      const icon = L.divIcon({ html: createPinHtml(1), className: '', iconSize: [36, 36], iconAnchor: [18, 36] })
      const m = L.marker([lat, lng], { icon })
      m.addTo(layer)
      m.bindPopup(`<b>${selectedChild.title || 'Untitled'}</b>`)
      try { map.invalidateSize() } catch (_) {}
      try { map.setView([lat, lng], 17) } catch (_) {}
      return
    }

    if (!points.length && latitude && longitude) {
      // Fallback: show marker for selectedItem if no children/references
      const createPinHtml = (index, size = 36, pinColor = '#0E5671') => `
        <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="${pinColor}"/>
          <circle cx="18" cy="13" r="7" fill="red"/>
        </svg>`

      const icon = L.divIcon({ html: createPinHtml(0, 36, '#0E5671'), className: '', iconSize: [36, 36], iconAnchor: [18, 36] })
      const marker = L.marker([latitude, longitude], { icon })
      marker.addTo(layer)
      marker.bindPopup(`<b>${itemTitle || 'Untitled'}</b>`)
      map.setView([latitude, longitude], 15)
      return
    }

    if (!points.length) {
      // No points and no item coords handled below; if neither, fallback to world view
      if (!childHasCoords && !(latitude && longitude)) {
        try { map.setView([0, 0], 2) } catch (_) {}
      }
      return
    }

  // Create numbered teardrop pin icons for each point
  const createPinHtml = (index, size = 36, pinColor = '#D60D46', numberColor = '#0E5671') => `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadow${index}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="${pinColor}" filter="url(#pinShadow${index})"/>
        <circle cx="18" cy="13" r="7" fill="red"/>
    <text x="18" y="17" font-size="10" font-weight="700" text-anchor="middle" fill="${numberColor}" font-family="Arial, sans-serif">${index}</text>
      </svg>`

    const markers = points.map((p) => {
      const isSelected = selectedChild && p.uuid === selectedChild.uuid
      const pinColor = isSelected ? 'red' : '#D60D46'
      const numberColor = isSelected ? '#ffffff' : '#0E5671'
      const html = createPinHtml(p.index, 36, pinColor, numberColor)
      const icon = L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 36] })
      const m = L.marker([p.lat, p.lng], { icon })

      m.bindPopup(`<b>${p.title || 'Untitled'}</b>`)

      m.on('click', () => {
        map.setView([p.lat, p.lng], 17)
        onSelectMarker(p.raw, selectedItem)
      })

      m.addTo(layer)
      return m
    })

    // If this selection is a tour, draw a styled route: white outline under a teal main line
    if ((selectedItem?.type === 'tour' || selectedItem?.type === 'museum') && points.length >= 2) {
      const latlngs = points.map((p) => [p.lat, p.lng])
      // Outline for contrast on map tiles
      const outline = L.polyline(latlngs, { color: '#ffffff', weight: 8, opacity: 0.95, lineCap: 'round', lineJoin: 'round' })
      outline.addTo(layer)
      // Main route line
      const main = L.polyline(latlngs, { color: '#0E5671', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round' })
      main.addTo(layer)
      // Ensure markers render above the route so numbers remain visible
      try {
        markers.forEach((m) => { try { m.bringToFront && m.bringToFront() } catch (_) {} })
      } catch (_) {}
    }

    const selectedPoint = selectedChild && points.find((p) => p.uuid === selectedChild.uuid)
    if (selectedPoint) {
      try { map.invalidateSize() } catch (_) {}
      try {
        map.setView([selectedPoint.lat, selectedPoint.lng], 17)
      } catch (_) {}
    } else {
      try {
        const group = L.featureGroup(markers)
        try {
          map.invalidateSize()
          map.fitBounds(group.getBounds().pad(0.12), { maxZoom: 17 })
        } catch (_) {
          map.setView([points[0].lat, points[0].lng], 13)
        }
      } catch (_) {
        try {
          map.invalidateSize()
          map.setView([points[0].lat, points[0].lng], 13)
        } catch (_) {}
      }
    }
  }

  const MapView = () => (
    <div className="relative w-full h-full rounded overflow-hidden border border-white bg-white">
      <div ref={mapRef} className="w-full h-full" style={{ height: "100%", minHeight: "300px" }} />
    </div>
  )

  if (mapOnly) {
    if (limitReached) return null
    return <MapView />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col items-center w-full divide-y divide-white">
        <h2 className="text-2xl font-bold mb-4 text-center text-[#0E5671]">{itemTitle}</h2>

        {itemImage ? (
          <img src={itemImage || "/placeholder.svg"} alt={itemTitle} className="w-full max-w-md mb-4 rounded shadow" />
        ) : (
          <div className="w-full max-w-md mb-4 flex items-center justify-center h-32 bg-gray-100 rounded shadow text-gray-400 text-lg font-semibold">
            N/A
          </div>
        )}

        {itemAudio && <audio controls src={itemAudio} className="w-full mb-4" />}

        <div className="text-gray-700 text-center mb-4 text-base leading-relaxed w-full">
          {itemDescription ? (
            <div className="max-h-24 overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: itemDescription }} />
          ) : (
            <p>No description available.</p>
          )}
        </div>
        {affiliateLink ? (
          <div className="mt-2 mb-4">
            <a href={affiliateLink} target="_blank" rel="noopener noreferrer" className="inline-block bg-[#0E5671] hover:bg-[#083c4d] text-white px-4 py-2 rounded no-underline">
              More details
            </a>
          </div>
        ) : null}

  {/* Show the map panel when requested; default view is set during initialization */}
  {showMapInPanel && <MapView />}
      </div>
    </div>
  )
}
