"use client"
import React from 'react';

import { useEffect, useState } from "react"

import SharedDetailsView from "./SharedDetailsView"

export default function TourDetailWidget() {
  const apiKey = typeof window !== "undefined" && window.API_KEY ? String(window.API_KEY) : ""

  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedChild, setSelectedChild] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState({ type: null, idx: null })
  const [limitReached, setLimitReached] = useState(false)
  const [userData, setUserData] = useState(null)
  const [childDetailsCache, setChildDetailsCache] = useState({})
  const [fetchingChildDetails, setFetchingChildDetails] = useState(false)
  const [selectionVersion, setSelectionVersion] = useState(0)

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserData(user)
      setLimitReached(user.limit_reach === true)
    }
  }, [])

  const handleViewDetails = (item, type = null, idx = null) => {    // Only toggle the children/references list; do not open parent details
    // Toggle the expanded list for this item; do NOT clear selectedItem/selectedChild when collapsing
    if (type && idx !== null) {
      const willCollapse = expandedIdx.type === type && expandedIdx.idx === idx
      const newExpanded = willCollapse ? { type: null, idx: null } : { type, idx }
      setExpandedIdx(newExpanded)

      if (!willCollapse) {
        // Expanding: show parent details and reset child selection
        setSelectedItem({ ...item })
        setSelectedChild(null)
        setSelectionVersion((v) => v + 1)
      }
      // If collapsing, hide selected details and map by clearing selections
      if (willCollapse) {
        setSelectedItem(null)
        setSelectedChild(null)
        // bump selectionVersion so map components react to the change
        setSelectionVersion((v) => v + 1)
      }
    } else {
      // If no type/idx passed, just select the item
      setSelectedItem({ ...item })
      setSelectedChild(null)
      setSelectionVersion((v) => v + 1)
    }
    setError("")
  }

  const handleSelectChild = async (child, item) => {
    if (limitReached) {
      setError("Your credit limit has been reached. Please upgrade your plan to continue viewing details.")
      return
    }

    // Check if we already have the details for this child
    if (childDetailsCache[child.uuid]) {
  // Use shallow copies so identity changes and downstream effects run
  setSelectedChild({ ...childDetailsCache[child.uuid], affiliateLink: childDetailsCache[child.uuid].affiliateLink ?? child.affiliateLink })
  setSelectedItem({ ...item })
  setSelectionVersion((v) => v + 1)
      setError("")
      return
    }

    // Optimistically show the child immediately so map can zoom to its coordinates
  setSelectedChild({ ...child })
  setSelectedItem({ ...item })
  setSelectionVersion((v) => v + 1)

    // Fetch details for the child using DetailsMutation
    setFetchingChildDetails(true)
    setError("")

    try {
      const response = await fetch("http://client-private-api-stage.izi.travel/graphql", {
        method: "POST",
        headers: {
          Accept: "application/izi-client-private-api-v1.0+json",
          "X-IZI-API-KEY": "350e8400-e29b-41d4-a716-446655440003",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            mutation DetailsMutation($input: DetailsMutationInput!) {
              mtgObjectDetails(input: $input) {
                mtgObjectDetail {
                  status
                  type
                  title
                  uuid
                  language
                  description
                  userLimit
                  location{
                    latitude
                    longitude
                  }
                  images {
                    url
                  }
                  content {
                    audio {
                      url
                    }
                  }
                }
              }
            }
          `,
          variables: {
            input: {
              uuid: child.uuid,
              languages: [child.language || "any"],
            },
          },
        }),
      })

      const { data, errors } = await response.json()

      if (errors) {
        throw new Error(errors[0]?.message || "Error fetching child details")
      }

      const childDetails = data?.mtgObjectDetails?.mtgObjectDetail

      if (childDetails) {
        // Cache the fetched details
        setChildDetailsCache((prev) => ({
          ...prev,
          [child.uuid]: { ...childDetails, affiliateLink: childDetails.affiliateLink ?? child.affiliateLink },
        }))

  // Set the selected child with full details (use shallow copies)
  setSelectedChild({ ...childDetails, affiliateLink: childDetails.affiliateLink ?? child.affiliateLink })
  setSelectedItem({ ...item })
  setSelectionVersion((v) => v + 1)
      } else {
        throw new Error("No details found for this item")
      }
    } catch (err) {
      setError(err.message || "Failed to fetch child details")
  // Fallback to showing basic child info (shallow copies)
  setSelectedChild({ ...child })
  setSelectedItem({ ...item })
  setSelectionVersion((v) => v + 1)
    } finally {
      setFetchingChildDetails(false)
    }
  }

  const handleTitleClick = (item, type, idx) => {
  // Toggle expand/collapse of the children/references list only; keep details/map visible when collapsing
  const willCollapse = expandedIdx.type === type && expandedIdx.idx === idx
  setExpandedIdx(willCollapse ? { type: null, idx: null } : { type, idx })
  if (!willCollapse) {
    setSelectedItem({ ...item })
    setSelectedChild(null)
    setSelectionVersion((v) => v + 1)
  } else {
    // Collapsing: hide details and map
    setSelectedItem(null)
    setSelectedChild(null)
    setSelectionVersion((v) => v + 1)
  }
  setError("")
  }

  useEffect(() => {
    if (!apiKey) return
    setLoading(true)
    setError("")

    fetch("http://client-private-api-stage.izi.travel/graphql", {
      method: "POST",
      headers: {
        Accept: "application/izi-client-private-api-v1.0+json",
        "X-IZI-API-KEY": "350e8400-e29b-41d4-a716-446655440003",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          mutation DetailsBatchMutation($input: DetailsBatchMutationInput!) {
            bulkMtgObjectDetails(input: $input) {
              data {
                status
                type
                title
                uuid
                language
                affiliateLink
                description
                userLimit
                images { url }
                location{
                    latitude
                    longitude
                  }
                content {
                  audio { url }
                  children {
                    uuid
                    language
                    affiliateLink
                    title
                    description
                    type
                    images { url }
                    content { audio { url } }
                    location{
                      latitude
                      longitude
                    }
                    status
                  }
                }
              }
            }
          }
        `,
        variables: { input: { widgetApiKey: apiKey } },
      }),
    })
      .then((res) => res.json())
      .then(({ data, errors }) => {
        if (errors) throw new Error(errors[0]?.message || "Error")
        const items = data?.bulkMtgObjectDetails?.data || []
        const anyLimit = items.find((i) => typeof i?.userLimit !== "undefined")
        const limit =
          typeof anyLimit?.userLimit === "object"
            ? Boolean(anyLimit.userLimit?.limitReached)
            : Boolean(anyLimit?.userLimit)
        setLimitReached(limit)
        setResults(items.filter((r) => r && r.status === "published"))
      })
      .catch((err) => {
        setError(err.message || "Failed to fetch results")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [apiKey])

  const tours = results.filter((r) => r?.type === "tour" && r.status === "published")
  const museums = results.filter((r) => r?.type === "museum" && r.status === "published")
  const totalListCount = tours.length + museums.length

  const getMarkerNumber = () => {
    if (selectedChild && selectedItem) {
      const children = (selectedItem?.content?.[0]?.children || []).filter((c) => c?.status === "published")
      const cIdx = children.findIndex((c) => c?.uuid === selectedChild?.uuid)
      if (cIdx !== -1) return cIdx + 1
      return undefined
    }
    if (selectedItem) {
      const list = selectedItem.type === "tour" ? tours : museums
      const idx = list.findIndex((i) => i?.uuid === selectedItem?.uuid)
      return idx !== -1 ? idx + 1 : undefined
    }
    return undefined
  }

  return (
    <main className="bg-gray-100 text-black">
      <div className="w-full max-w-full mx-auto py-6 relative overflow-hidden">
        {error && <div className="text-red-600 mb-4 bg-red-100 p-3 rounded border border-red-300">{error}</div>}

        {/* Limit reached message for details */}
        {limitReached && (selectedChild || selectedItem) && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300">
            <div className="text-center text-red-800">
              <div className="text-lg font-semibold mb-2">⚠️ Credit Limit Reached</div>
              <p className="text-sm">
                You have reached your credit limit and cannot view detailed information. Please upgrade your plan to
                continue accessing tour and museum details.
              </p>
            </div>
          </div>
        )}

        {loading && <div className="text-gray-600 p-4 text-center text-lg">Loading...</div>}

        {/* Show tours and museums list, details and map side-by-side */}
        <div className="responsive-grid">
          {!loading && !error && (
            <div>
              <h2 className="text-2xl font-bold mb-4 text-black">Tour & Museum List</h2>
              <div className="bg-white overflow-y-auto border border-gray-300 shadow-sm"
                style={{ height: (expandedIdx?.type === "tour" || expandedIdx?.type === "museum" || totalListCount > 3) ? '402px' : 'auto' }}>
                {/* Tours Section */}
                {tours.length > 0 && (
                  <div>
                    {tours.map((item, idx) => (
                      <div key={item.uuid}>
                        <div
                          className={`flex justify-between items-center border-b border-gray-200 p-4 ${selectedItem && selectedItem.uuid === item.uuid ? "bg-[#0E5671] text-white" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-semibold cursor-pointer ${selectedItem && selectedItem.uuid === item.uuid ? "text-white" : "text-gray-800"}`}
                              onClick={() => handleTitleClick(item, "tour", idx)}
                            >
                              {item.title}
                            </span>
                          </div>
                                                  </div>
                        {/* Children list below the selected tour */}
                        {expandedIdx.type === "tour" && expandedIdx.idx === idx && (
                          <div>
                            {item.content?.[0]?.children?.filter((c) => c?.status === "published")?.length > 0 ? (
                              <div className="relative">
                                {/* Removed vertical line */}
                                <ol className="margin-0 padding-0 list-none">
                                  {item.content[0].children.filter((child) => child?.status === "published").map((child, cidx) => {
                                    const isSelected = selectedChild && selectedChild.uuid === child.uuid
                                    return (
                                      <li
                                        key={cidx}
                                        className={`relative pl-8 py-2 border border-gray-200 flex items-center cursor-pointer ${isSelected ? "bg-[#0E5671] text-white rounded" : "bg-white text-black"}`}
                                        onClick={() => handleSelectChild(child, item)}
                                      >
                                        <span
                                          className={`absolute -translate-x-1/2 top-2 w-6 h-6 rounded-full border ${isSelected ? "bg-[#0E5671] border-[#0E5671] text-white" : "bg-white border-gray-300 text-gray-700"} inline-flex items-center justify-center text-xs font-bold`} style={{left:'16px', top: '18px'}}
                                        >
                                          {cidx + 1}
                                        </span>
                                        {child.images?.[0]?.url ? (
                                          <img
                                            src={child.images[0].url || "/placeholder.svg"}
                                            alt={child.title}
                                            className="w-12 h-12 object-cover rounded mr-3"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 flex items-center justify-center rounded text-gray-600 text-xs font-semibold mr-3" style={{background:'grey-200'}}>
                                            N/A
                                          </div>
                                        )}
                                        <span className="font-medium truncate">{child.title || "No title"}</span>

                                        <span
                                          className={`ml-auto w-6 h-6 rounded-full border inline-flex items-center justify-center ${isSelected ? "border-white text-white" : "border-gray-300 text-gray-500"}`} style={{marginRight: '10px'}}
                                        >
                                          ›
                                        </span>
                                        {fetchingChildDetails && isSelected && (
                                          <span className="ml-2 text-xs text-white">Loading...</span>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ol>
                              </div>
                            ) : (
                              <div className="text-gray-600">No children available.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Museums Section */}
                {museums.length > 0 && (
                  <div>
                    {museums.map((item, idx) => (
                      <div key={item.uuid}>
                        <div
                          className={`flex justify-between items-center border-b border-gray-300 p-4 ${selectedItem && selectedItem.uuid === item.uuid ? "bg-[#0E5671] text-white" : "hover:bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`font-semibold cursor-pointer ${selectedItem && selectedItem.uuid === item.uuid ? "text-white" : "text-gray-800"}`}
                              onClick={() => handleTitleClick(item, "museum", idx)}
                            >
                              {item.title}
                            </span>
                          </div>
                          <button
                            className="bg-custom-red-50 hover:bg-custom-blue-50 text-white px-4 py-1 rounded text-sm truncate"
                            onClick={() => handleViewDetails(item, "museum", idx)}
                          >
                            Visit Museum
                          </button>
                        </div>
                        {/* Children list below the selected museum */}
                        {expandedIdx.type === "museum" && expandedIdx.idx === idx && (
                          <div className="bg-custom-blue-50 px-2 py-2 border-purple-500">
                            {item.content?.[0]?.children?.filter((c) => c?.status === "published")?.length > 0 ? (
                              <div className="relative">
                                {/* Removed vertical line */}
                                <ol className="margin-0 padding-0 list-none">
                                  {item.content[0].children.filter((child) => child?.status === "published").map((child, cidx) => {
                                    const isSelected = selectedChild && selectedChild.uuid === child.uuid
                                    return (
                                      <li
                                        key={cidx}
                                        className={`relative pl-8 py-2 flex items-center border border-gray-200 cursor-pointer ${isSelected ? "bg-[#0E5671] text-white rounded" : "bg-white text-black"}`}
                                        onClick={() => handleSelectChild(child, item)}
                                      >
                                        <span
                                          className={`absolute left-3 -translate-x-1/2 top-2 w-6 h-6 rounded-full border ${isSelected ? "bg-[#0E5671] border-[#0E5671] text-white" : "bg-white border-gray-300 text-gray-700"} inline-flex items-center justify-center text-xs font-bold`}
                                        >
                                          {cidx + 1}
                                        </span>
                                        {child.images?.[0]?.url ? (
                                          <img
                                            src={child.images[0].url || "/placeholder.svg"}
                                            alt={child.title}
                                            className="w-12 h-12 object-cover rounded mr-3"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 flex items-center justify-center rounded text-gray-600 text-xs font-semibold mr-3" style={{background: "#e0e0e0;"}}>
                                            N/A
                                          </div>
                                        )}
                                        <span className="font-medium">{child.title || "No title"}</span>
                                        <span
                                          className={`ml-auto w-6 h-6 rounded-full border inline-flex items-center justify-center ${isSelected ? "border-white text-white" : "border-gray-300 text-gray-400"}`}
                                        >
                                          ›
                                        </span>
                                        {fetchingChildDetails && isSelected && (
                                          <span className="ml-2 text-xs text-white">Loading...</span>
                                        )}
                                      </li>
                                    )
                                  })}
                                </ol>
                              </div>
                            ) : (
                              <div className="text-gray-600">No children available.</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* No results message */}
                {tours.length === 0 && museums.length === 0 && results.length > 0 && (
                  <div className="p-4 text-center text-gray-500">No published tours or museums found.</div>
                )}
              </div>
            </div>
          )}
          {(selectedChild || selectedItem) && (
            <>
              <div className="mt-16 overflow-y-auto bg-white rounded-lg border border-gray-300 shadow-sm p-3" style={{height:'402px'}}>
                <SharedDetailsView
                  selectedChild={selectedChild}
                  selectedItem={selectedItem}
                  limitReached={limitReached}
                  markerNumber={getMarkerNumber()}
                  selectionVersion={selectionVersion}
                  onSelectMarker={(child, parent) => handleSelectChild(child, parent)}
                />
              </div>
              <div className="mt-16 bg-white rounded-lg border border-gray-300 shadow-sm p-3">
                <SharedDetailsView
                  selectedChild={selectedChild}
                  selectedItem={selectedItem}
                  limitReached={limitReached}
                  markerNumber={getMarkerNumber()}
                  selectionVersion={selectionVersion}
                  mapOnly={true}
                  onSelectMarker={(child, parent) => handleSelectChild(child, parent)}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
