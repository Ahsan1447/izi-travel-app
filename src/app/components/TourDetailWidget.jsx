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

  useEffect(() => {
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserData(user)
      setLimitReached(user.limit_reach === true)
    }
  }, [])

  const handleViewDetails = (item, type = null, idx = null) => {
    if (limitReached) {
      setError("Your credit limit has been reached. Please upgrade your plan to continue viewing details.")
      return
    }

    // Toggle the details box - if same item is clicked, hide it
    if (selectedItem && selectedItem.uuid === item.uuid) {
      setSelectedItem(null)
      setSelectedChild(null)
    } else {
      setSelectedItem(item)
      setSelectedChild(null)
    }

    if (type && idx !== null) {
      setExpandedIdx(expandedIdx.type === type && expandedIdx.idx === idx ? { type: null, idx: null } : { type, idx })
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
      setSelectedChild(childDetailsCache[child.uuid])
      setSelectedItem(item)
      setError("")
      return
    }

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
          [child.uuid]: childDetails,
        }))

        // Set the selected child with full details
        setSelectedChild(childDetails)
        setSelectedItem(item)
      } else {
        throw new Error("No details found for this item")
      }
    } catch (err) {
      setError(err.message || "Failed to fetch child details")
      // Fallback to showing basic child info
      setSelectedChild(child)
      setSelectedItem(item)
    } finally {
      setFetchingChildDetails(false)
    }
  }

  const handleTitleClick = (item, type, idx) => {
    if (limitReached) {
      setError("Your credit limit has been reached. Please upgrade your plan to continue viewing details.")
      return
    }

    setExpandedIdx(expandedIdx.type === type && expandedIdx.idx === idx ? { type: null, idx: null } : { type, idx })
    // Toggle tour details - if same tour is clicked, hide it
    if (selectedItem && selectedItem.uuid === item.uuid) {
      setSelectedItem(null)
      setSelectedChild(null)
    } else {
      setSelectedItem(item)
      setSelectedChild(null)
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
                description
                userLimit
                images { url }
                location{
                    latitude
                    longitude
                  }
                content {
                  audio { url }
                  references {
                    uuid
                    language
                    affiliateLink
                    title
                    description
                    images { url }
                    content { audio { url } }
                    location{
                      latitude
                      longitude
                    }
                  }
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

  const getMarkerNumber = () => {
    if (selectedChild && selectedItem) {
      const children = selectedItem?.content?.[0]?.children || []
      const references = selectedItem?.content?.[0]?.references || []
      const cIdx = children.findIndex((c) => c?.uuid === selectedChild?.uuid)
      if (cIdx !== -1) return cIdx + 1
      const rIdx = references.findIndex((r) => r?.uuid === selectedChild?.uuid)
      if (rIdx !== -1) return rIdx + 1
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
    <main className="wrapper min-h-screen bg-gray-100 text-gray-800">
      <div className="w-full max-w-full mx-auto px-8 py-6 relative overflow-hidden">
        {error && <div className="text-red-600 mb-4 bg-red-100 p-3 rounded border border-red-300">{error}</div>}

        {/* Limit reached message for details */}
        {limitReached && (selectedChild || selectedItem) && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 border border-red-300">
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
        <div className="flex items-start gap-2">
          {!loading && !error && (
            <div className="w-1/3 max-w-md mr-4">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Tour & Museum List</h2>
              <div className="bg-white rounded-lg overflow-y-auto max-h-96 border border-gray-300 shadow-sm">
                {/* Tours Section */}
                {tours.length > 0 && (
                  <div>
                    {tours.map((item, idx) => (
                      <div key={item.uuid}>
                        <div
                          className={`flex justify-between items-center border-b border-gray-200 p-4 ${selectedItem && selectedItem.uuid === item.uuid ? "bg-[#0E5671] text-white" : "hover:bg-custom-blue-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="font-semibold cursor-pointer text-gray-800"
                              onClick={() => handleTitleClick(item, "tour", idx)}
                            >
                              {item.title}
                            </span>
                          </div>
                          <button
                            className="bg-fuchsia-600 hover:bg-custom-blue-50 text-white px-4 py-1 rounded text-sm"
                            onClick={() => handleViewDetails(item, "tour", idx)}
                          >
                            More Details
                          </button>
                        </div>
                        {/* Children list below the selected tour */}
                        {expandedIdx.type === "tour" && expandedIdx.idx === idx && (
                          <div className="bg-gray-50 px-2 py-2 border-l-4 border-purple-500">
                            {item.content?.[0]?.children?.length > 0 ? (
                              <div className="relative">
                                <div className="absolute left-13 top-3 bottom-0 w-px bg-[#0E5671]"></div>
                                <ol className="mb-2">
                                  {item.content[0].children.map((child, cidx) => {
                                    const isSelected = selectedChild && selectedChild.uuid === child.uuid
                                    return (
                                      <li
                                        key={cidx}
                                        className={`relative pl-8 py-2 flex items-center cursor-pointer ${isSelected ? "bg-[#0E5671] text-white rounded" : ""}`}
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
                                          <div className="w-12 h-12 flex items-center justify-center bg-gray-200 rounded text-gray-500 text-xs font-semibold mr-3">
                                            N/A
                                          </div>
                                        )}
                                        <span className="font-medium">{child.title || "No title"}</span>
                                        {isSelected && child.affiliateLink && (
                                          <a
                                            href={child.affiliateLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`ml-2 px-2 py-1 rounded text-xs ${isSelected ? "bg-white text-[#0E5671]" : "bg-amber-600 text-white bg-custom-blue-50"}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Affiliate
                                          </a>
                                        )}
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
                              <div className="text-gray-500">No children available.</div>
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
                          className={`flex justify-between items-center border-b border-gray-200 p-4 ${selectedItem && selectedItem.uuid === item.uuid ? "bg-[#0E5671] text-white" : "hover:bg-custom-blue-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="font-semibold cursor-pointer text-gray-800"
                              onClick={() => handleTitleClick(item, "museum", idx)}
                            >
                              {item.title}
                            </span>
                          </div>
                          <button
                            className="bg-custom-red-50 hover:bg-custom-blue-50 text-white px-4 py-1 rounded text-sm"
                            onClick={() => handleViewDetails(item, "museum", idx)}
                          >
                            Visit Museum
                          </button>
                        </div>
                        {/* References list below the selected museum */}
                        {expandedIdx.type === "museum" && expandedIdx.idx === idx && (
                          <div className="bg-gray-50 px-2 py-2 border-l-4 border-purple-500">
                            {item.content[0]?.references?.length > 0 ? (
                              <div className="relative">
                                <div className="absolute left-13 top-3 bottom-0 w-px bg-[#0E5671]"></div>
                                <ol className="mb-2">
                                  {item.content[0].references.map((ref, ridx) => {
                                    const isSelected = selectedChild && selectedChild.uuid === ref.uuid
                                    return (
                                      <li
                                        key={ridx}
                                        className={`relative pl-8 py-2 flex items-center cursor-pointer ${isSelected ? "bg-[#0E5671] text-white rounded" : ""}`}
                                        onClick={() => handleSelectChild(ref, item)}
                                      >
                                        <span
                                          className={`absolute left-3 -translate-x-1/2 top-2 w-6 h-6 rounded-full border ${isSelected ? "bg-[#0E5671] border-[#0E5671] text-white" : "bg-white border-gray-300 text-gray-700"} inline-flex items-center justify-center text-xs font-bold`}
                                        >
                                          {ridx + 1}
                                        </span>
                                        {ref.images?.[0]?.url ? (
                                          <img
                                            src={ref.images[0].url || "/placeholder.svg"}
                                            alt={ref.title}
                                            className="w-12 h-12 object-cover rounded mr-3"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 flex items-center justify-center bg-gray-200 rounded text-gray-500 text-xs font-semibold mr-3">
                                            N/A
                                          </div>
                                        )}
                                        <span className="font-medium">{ref.title || "No title"}</span>
                                        {isSelected && ref.affiliateLink && (
                                          <a
                                            href={ref.affiliateLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`ml-2 px-2 py-1 rounded text-xs ${isSelected ? "bg-white text-[#0E5671]" : "bg-custom-red-50 text-white hover:bg-custom-blue-50"}`}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            Affiliate
                                          </a>
                                        )}
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
                              <div className="text-gray-500">No references available.</div>
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
              <div className="w-1/3 mt-16 max-h-96 overflow-y-auto">
                <SharedDetailsView
                  selectedChild={selectedChild}
                  selectedItem={selectedItem}
                  limitReached={limitReached}
                  markerNumber={getMarkerNumber()}
                />
              </div>
              <div className="w-1/3 mt-16">
                <SharedDetailsView
                  selectedChild={selectedChild}
                  selectedItem={selectedItem}
                  limitReached={limitReached}
                  markerNumber={getMarkerNumber()}
                  mapOnly={true}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
