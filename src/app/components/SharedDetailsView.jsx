"use client"

import React, { useState } from "react"

export default function SharedDetailsView({
  selectedChild,
  selectedItem,
  limitReached,
  markerNumber,
  showMapInPanel = false,
  mapOnly = false,
}) {
  const [isSatelliteView, setIsSatelliteView] = useState(false)

  if (limitReached) return null
  if (!selectedChild && !selectedItem) return null

  const currentItem = selectedChild || selectedItem
  const itemTitle = currentItem.title
  const itemImage = currentItem.images?.[0]?.url
  const itemAudio = currentItem.content?.[0]?.audio?.[0]?.url
  const itemDescription = currentItem.description || ""

  const location = (selectedChild && selectedChild.location) || (selectedItem && selectedItem.location) || null
  const latitude = location?.latitude != null ? Number(location.latitude) : null
  const longitude = location?.longitude != null ? Number(location.longitude) : null
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude)

  const getMapUrl = () => {
    const baseUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`
    return isSatelliteView ? `${baseUrl}&t=k` : baseUrl
  }

  const MapView = () => (
    <div className="relative w-full max-w-md rounded overflow-hidden border border-white bg-white">
      <div className="absolute top-2 right-2 z-10 flex bg-white rounded shadow-lg border border-gray-300 overflow-hidden">
        <button
          onClick={() => setIsSatelliteView(false)}
          className={`px-3 py-1 text-xs font-medium transition-colors text-white ${
            !isSatelliteView
              ? "bg-[#0E5671]"
              : "bg-white text-[#0E5671] hover:bg-[#0E5671] hover:text-white"
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setIsSatelliteView(true)}
          className={`px-3 py-1 text-xs font-medium transition-colors text-white ${
            isSatelliteView
              ? "bg-[#0E5671]"
              : "bg-white text-[#0E5671] hover:bg-[#0E5671] hover:text-white"
          }`}
        >
          Satellite
        </button>
      </div>

      <iframe
        title="location-map"
        src={getMapUrl()}
        className="w-full"
        className="w-full h-[400px] border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {typeof markerNumber === "number" && (
        <div
          className="w-10 h-10 rounded-full bg-[#0E5671] text-white inline-flex items-center justify-center shadow-lg border border-white text-sm font-bold"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
        >
          {markerNumber}
        </div>
      )}
    </div>
  )

  if (mapOnly) {
    if (limitReached) return null
    if (!hasCoords) return null
    return <MapView />
  }

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-lg shadow-lg border border-white">
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

        {showMapInPanel && hasCoords && <MapView />}
      </div>
    </div>
  )
}
