"use client"

import React, { useRef, useEffect, useState } from "react"

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
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const directionsRendererRef = useRef(null)
  const directionsServiceRef = useRef(null)

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

  // Collect images from selected item, selected child, and all children of the selected item
  const collectImages = () => {
    const urls = []
    const pushUrl = (u) => { if (u && typeof u === "string") urls.push(u) }
    try {
      (currentItem?.images || []).forEach(img => pushUrl(img?.url))
    } catch (_) {}
    try {
      (selectedChild?.images || []).forEach(img => pushUrl(img?.url))
    } catch (_) {}
    try {
      const children = selectedItem?.content?.[0]?.children || []
      children.forEach(child => {
        (child?.images || []).forEach(img => pushUrl(img?.url))
      })
    } catch (_) {}
    const seen = new Set()
    return urls.filter(u => { if (!u || seen.has(u)) return false; seen.add(u); return true })
  }
  const imageUrls = collectImages()
  const totalImages = imageUrls.length

  const [currentIdx, setCurrentIdx] = useState(0)
  useEffect(() => { setCurrentIdx(0) }, [selectedItem?.uuid, selectedChild?.uuid, selectionVersion])

  const [transitioning, setTransitioning] = useState(false)
  const [prevIdx, setPrevIdx] = useState(null)
  const [nextIdx, setNextIdx] = useState(null)
  const [animTrigger, setAnimTrigger] = useState(false)

  const startTransition = (toIdx) => {
    if (!totalImages) return
    if (transitioning) return
    const safeToIdx = ((toIdx % totalImages) + totalImages) % totalImages
    if (safeToIdx === currentIdx) return
    setPrevIdx(currentIdx)
    setNextIdx(safeToIdx)
    setTransitioning(true)
    setAnimTrigger(false)
    requestAnimationFrame(() => setAnimTrigger(true))
    setTimeout(() => {
      setCurrentIdx(safeToIdx)
      setTransitioning(false)
      setPrevIdx(null)
      setNextIdx(null)
      setAnimTrigger(false)
    }, 300)
  }

  const goNext = () => startTransition(currentIdx + 1)
  const goPrev = () => startTransition(currentIdx - 1)

  const getKbClass = (idx) => {
    const dirs = ["kb-tl", "kb-tr", "kb-bl", "kb-br"]
    const i = typeof idx === "number" ? idx : 0
    return dirs[((i % dirs.length) + dirs.length) % dirs.length]
  }

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

  const apiKey = "AIzaSyCYPYRcmwn55zmHm0s-XJsLojbVOEN3kkc"

  function loadGoogleMaps(key) {
    if (typeof window === "undefined") return Promise.resolve()
    if (window.google && window.google.maps) return Promise.resolve()
    if (window.__gmapsInitPromise) return window.__gmapsInitPromise
    if (!key) {
      console.warn("Google Maps API key is not set. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or window.GOOGLE_MAPS_API_KEY.")
    }
    const src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key || "")}&v=weekly`
    window.__gmapsInitPromise = new Promise((resolve, reject) => {
      // Avoid injecting duplicate script tags
      const existing = Array.from(document.getElementsByTagName("script")).find(s => s.src && s.src.startsWith("https://maps.googleapis.com/maps/api/js"))
      if (existing) {
        existing.addEventListener("load", () => resolve())
        existing.addEventListener("error", (e) => reject(e))
        return
      }
      const script = document.createElement("script")
      script.src = src
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = (e) => reject(e)
      document.head.appendChild(script)
    })
    return window.__gmapsInitPromise
  }

  function clearMapArtifacts() {
    // Clear markers
    try {
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
    } catch (_) {}
    // Clear route
    try {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
        directionsRendererRef.current = null
      }
    } catch (_) {}
  }

  function createMarkerIcon(index, size = 36, options = { pinColor: "#D60D46", numberColor: "#0E5671", innerCircleColor: "red" }) {
    const { pinColor, numberColor, innerCircleColor } = options
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
      </svg>`
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size),
    }
  }

  function createSingleMarkerIcon() {
    const size = 36
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="pinShadowSingle" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25"/>
          </filter>
        </defs>
        <path d="M18 1c-5.523 0-10 4.477-10 10 0 7 10 19 10 19s10-12 10-19c0-5.523-4.477-10-10-10z" fill="#0E5671" filter="url(#pinShadowSingle)"/>
        <circle cx="18" cy="13" r="7" fill="red"/>
      </svg>`
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size / 2, size),
    }
  }

  function updateMap() {
    const google = window.google
    const map = mapInstanceRef.current
    if (!google || !map) return

    clearMapArtifacts()

    const points = getPoints()

    // If no points but child has coords -> show single child marker
    const childHasCoords = selectedChild &&
      Number.isFinite(Number(selectedChild.location?.latitude)) &&
      Number.isFinite(Number(selectedChild.location?.longitude))

    if (!points.length && childHasCoords) {
      const lat = Number(selectedChild.location.latitude)
      const lng = Number(selectedChild.location.longitude)
      const marker = new google.maps.Marker({
        position: { lat, lng },
        icon: createMarkerIcon(1, 42, { pinColor: "#6B7280", numberColor: "#ffffff", innerCircleColor: "#6B7280" }),
        map,
      })
      markersRef.current.push(marker)
      const infowindow = new google.maps.InfoWindow({ content: `<b>${selectedChild.title || 'Untitled'}</b>` })
      marker.addListener('click', () => {
        infowindow.open({ anchor: marker, map })
        map.setZoom(18)
        map.panTo({ lat, lng })
        onSelectMarker(selectedChild, selectedItem)
      })
      map.setZoom(18)
      map.panTo({ lat, lng })
      return
    }

    if (!points.length && latitude && longitude) {
      // Fallback to selected item location
      const lat = Number(latitude)
      const lng = Number(longitude)
      const marker = new google.maps.Marker({
        position: { lat, lng },
        icon: createSingleMarkerIcon(),
        map,
      })
      markersRef.current.push(marker)
      const infowindow = new google.maps.InfoWindow({ content: `<b>${itemTitle || 'Untitled'}</b>` })
      marker.addListener('click', () => {
        infowindow.open({ anchor: marker, map })
        map.setZoom(15)
        map.panTo({ lat, lng })
      })
      map.setZoom(15)
      map.panTo({ lat, lng })
      return
    }

    if (!points.length) {
      map.setZoom(2)
      map.panTo({ lat: 0, lng: 0 })
      return
    }

    // Place numbered markers
    const bounds = new google.maps.LatLngBounds()
    const markers = points.map((p) => {
      const isSelected = selectedChild && p.uuid === selectedChild.uuid
      const pinColor = isSelected ? '#6B7280' : '#D60D46'
      const numberColor = isSelected ? '#ffffff' : '#0E5671'
      const size = isSelected ? 42 : 36
      const innerCircleColor = isSelected ? '#6B7280' : 'red'
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        icon: createMarkerIcon(p.index, size, { pinColor, numberColor, innerCircleColor }),
        map,
      })
      markersRef.current.push(marker)
      bounds.extend(new google.maps.LatLng(p.lat, p.lng))

      const infowindow = new google.maps.InfoWindow({ content: `<b>${p.title || 'Untitled'}</b>` })
      marker.addListener('click', () => {
        infowindow.open({ anchor: marker, map })
        map.setZoom(18)
        map.panTo({ lat: p.lat, lng: p.lng })
        onSelectMarker(p.raw, selectedItem)
      })
      return marker
    })

    const isTourLike = (selectedItem?.type === 'tour' || selectedItem?.type === 'museum') && points.length >= 2

    if (isTourLike) {
      // Use Google DirectionsService to compute route through waypoints
      if (!directionsServiceRef.current) {
        directionsServiceRef.current = new google.maps.DirectionsService()
      }
      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          suppressMarkers: true,
          preserveViewport: true,
          polylineOptions: {
            strokeColor: '#0E5671',
            strokeOpacity: 0.95,
            strokeWeight: 4,
          }
        })
      }
      directionsRendererRef.current.setMap(map)

      const origin = { lat: points[0].lat, lng: points[0].lng }
      const destination = { lat: points[points.length - 1].lat, lng: points[points.length - 1].lng }
      const waypoints = points.slice(1, -1).map(p => ({ location: { lat: p.lat, lng: p.lng }, stopover: true }))

      directionsServiceRef.current.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            directionsRendererRef.current.setDirections(result)
          } else {
            // Fallback to straight polyline if Directions fails
            try {
              const polyline = new google.maps.Polyline({
                path: points.map(p => ({ lat: p.lat, lng: p.lng })),
                geodesic: true,
                strokeColor: '#0E5671',
                strokeOpacity: 0.95,
                strokeWeight: 4,
                map,
              })
              // Keep reference so it can be cleared next update
              directionsRendererRef.current = {
                setMap: (m) => polyline.setMap(m),
              }
            } catch (_) {}
          }
        }
      )
    }

    const selectedPoint = selectedChild && points.find((p) => p.uuid === selectedChild.uuid)
    if (selectedPoint) {
      map.setZoom(18)
      map.panTo({ lat: selectedPoint.lat, lng: selectedPoint.lng })
    } else {
      try {
        map.fitBounds(bounds)
        // Cap max zoom after fitting bounds
        const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 17) map.setZoom(17)
        })
        // Ensure listener is not leaked on subsequent updates
        setTimeout(() => google.maps.event.removeListener(listener), 2000)
      } catch (_) {
        map.setZoom(13)
        map.panTo({ lat: points[0].lat, lng: points[0].lng })
      }
    }

    // Make sure markers stay visible above route
    try { markers.forEach(m => m.setZIndex(google.maps.Marker.MAX_ZINDEX + 1)) } catch (_) {}
  }

  function initMap() {
    const google = window.google
    if (!mapRef.current || !google) return

    // Dispose previous if any
    try { if (mapInstanceRef.current) mapInstanceRef.current = null } catch (_) {}

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 0, lng: 0 },
      zoom: 2,
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      mapTypeControl: true,
      streetViewControl: false,
      fullscreenControl: true,
    })

    mapInstanceRef.current = map
    updateMap()
  }

  // Initialize Google Maps when needed and container is present
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    let mounted = true

    const ensure = async () => {
      if (!mounted) return
      if (!mapRef.current) {
        setTimeout(ensure, 100)
        return
      }
      try {
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        initMap()
      } catch (e) {
        console.error("Failed to load Google Maps API", e)
      }
    }

    ensure()

    return () => {
      mounted = false
      clearMapArtifacts()
      try { if (directionsRendererRef.current) directionsRendererRef.current.setMap(null) } catch (_) {}
      directionsRendererRef.current = null
      directionsServiceRef.current = null
      mapInstanceRef.current = null
    }
  }, [mapOnly, showMapInPanel, selectionVersion])

  // Recenter/update when the selected parent changes
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    if (!mapInstanceRef.current) return
    try { updateMap() } catch (_) {}
  }, [selectedItem?.uuid, selectionVersion])

  // Update markers/routes when child selection changes
  useEffect(() => {
    if (!mapInstanceRef.current) return
    try { updateMap() } catch (_) {}
  }, [selectedItem, selectedChild, selectionVersion])

  // Ensure map shows when a child is selected and map exists
  useEffect(() => {
    if (!mapOnly && !showMapInPanel) return
    if (!selectedChild) return
    if (!mapInstanceRef.current) return
    try { updateMap() } catch (_) {}
  }, [selectedChild?.uuid])

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

        {imageUrls.length > 0 ? (
          <div
            className="relative w-full max-w-md mb-4 rounded shadow overflow-hidden"
          >
            {transitioning ? (
              <>
                <img
                  src={imageUrls[prevIdx] || "/placeholder.svg"}
                  alt={`${itemTitle} image ${Number(prevIdx) + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover select-none kb-img ${getKbClass(prevIdx)}`}
                  style={{
                    opacity: animTrigger ? 0 : 1,
                    transition: "opacity 600ms ease",
                  }}
                  draggable={false}
                />
                <img
                  src={imageUrls[nextIdx] || "/placeholder.svg"}
                  alt={`${itemTitle} image ${Number(nextIdx) + 1}`}
                  className={`absolute inset-0 w-full h-full object-cover select-none kb-img ${getKbClass(nextIdx)}`}
                  style={{
                    opacity: animTrigger ? 1 : 0,
                    transition: "opacity 600ms ease",
                  }}
                  draggable={false}
                />
              </>
            ) : (
              <img
                src={imageUrls[currentIdx] || "/placeholder.svg"}
                alt={`${itemTitle} image ${currentIdx + 1}`}
                className={`w-full object-cover select-none kb-img ${getKbClass(currentIdx)}`}
                draggable={false}
              />
            )}
            {/* Left overlay button: displays '>' and goes to previous image as requested */}
            <button
              type="button"
              aria-label="Previous image"
              className="absolute inset-y-0 left-0 w-1/5 flex items-center justify-start text-white text-3xl bg-transparent hover:bg-black/10 focus:outline-none"
              onClick={(e) => { e.stopPropagation(); goPrev() }}
            >
              <span className="">&gt;</span>
            </button>
            {/* Right overlay button: displays '<' and goes to next image as requested */}
            <button
              type="button"
              aria-label="Next image"
              className="absolute inset-y-0 right-0 w-1/5 flex items-center justify-end text-white text-3xl bg-transparent hover:bg-black/10 focus:outline-none"
              onClick={(e) => { e.stopPropagation(); goNext() }}
            >
              <span className="">&lt;</span>
            </button>
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              {currentIdx + 1} / {totalImages}
            </div>
          </div>
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

        {showMapInPanel && <MapView />}
      </div>
      <style jsx>{`
        .kb-img { will-change: transform; transform-origin: center; }
        .kb-tl { animation: kb-tl 12s ease-in-out forwards; }
        .kb-tr { animation: kb-tr 12s ease-in-out forwards; }
        .kb-bl { animation: kb-bl 12s ease-in-out forwards; }
        .kb-br { animation: kb-br 12s ease-in-out forwards; }
        @keyframes kb-tl { from { transform: scale(1.05) translate3d(2%, 2%, 0); } to { transform: scale(1.2) translate3d(-2%, -2%, 0); } }
        @keyframes kb-tr { from { transform: scale(1.05) translate3d(-2%, 2%, 0); } to { transform: scale(1.2) translate3d(2%, -2%, 0); } }
        @keyframes kb-bl { from { transform: scale(1.05) translate3d(2%, -2%, 0); } to { transform: scale(1.2) translate3d(-2%, 2%, 0); } }
        @keyframes kb-br { from { transform: scale(1.05) translate3d(-2%, -2%, 0); } to { transform: scale(1.2) translate3d(2%, 2%, 0); } }
      `}</style>
    </div>
  )
}
