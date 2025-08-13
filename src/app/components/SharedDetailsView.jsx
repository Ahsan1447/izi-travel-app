"use client"

import React from 'react';

import { useState } from "react"

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

  // Determine coordinates if available
  const location = (selectedChild && selectedChild.location) || (selectedItem && selectedItem.location) || null
  const latitude = location?.latitude != null ? Number(location.latitude) : null
  const longitude = location?.longitude != null ? Number(location.longitude) : null
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude)

  // Strictly use provided affiliateLink; no modification, no fallback
  const ctaLink =
    selectedChild && selectedChild.affiliateLink
      ? selectedChild.affiliateLink
      : selectedItem && selectedItem.affiliateLink
        ? selectedItem.affiliateLink
        : null

  const getMapUrl = () => {
    const baseUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`
    return isSatelliteView ? `${baseUrl}&t=k` : baseUrl
  }

  const MapView = () => (
    <div className="relative w-full max-w-md rounded overflow-hidden border border-gray-300 bg-white">
      <div className="absolute top-2 right-2 z-10 flex bg-white rounded shadow-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setIsSatelliteView(false)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            !isSatelliteView ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setIsSatelliteView(true)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            isSatelliteView ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Satellite
        </button>
      </div>

      <iframe
        title="location-map"
        src={getMapUrl()}
        className="w-full"
        style={{ height: "400px", border: 0 }} // increased height from 260px to 400px
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />

      {typeof markerNumber === "number" && (
        <div
          className="w-10 h-10 rounded-full bg-fuchsia-600 text-white inline-flex items-center justify-center shadow-lg border border-white text-sm font-bold"
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -100%)" }}
        >
          {markerNumber}
        </div>
      )}
    </div>
  )

  // If only the map should be displayed, render map and exit
  if (mapOnly) {
    if (limitReached) return null
    if (!hasCoords) return null
    return <MapView />
  }

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold mb-4 text-center text-purple-900">{itemTitle}</h2>

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

        {ctaLink && (
          <a
            href={ctaLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex no-underline bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded shadow text-sm font-medium transition-all hover:shadow-lg"
          >
            Visit Link
          </a>
        )}
      </div>
    </div>
  )
}
