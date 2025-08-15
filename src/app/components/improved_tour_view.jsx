"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Users, ChevronRight, Play, Share2, Info } from "lucide-react"

interface TourItem {
  uuid: string
  title: string
  description?: string
  type: "tour" | "museum"
  images?: { url: string }[]
  location?: { latitude: number; longitude: number }
  content?: {
    audio?: { url: string }[]
    children?: TourItem[]
    references?: TourItem[]
  }[]
  affiliateLink?: string
  language?: string
}

interface ImprovedTourViewProps {
  tours?: TourItem[]
  museums?: TourItem[]
  onItemSelect?: (item: TourItem) => void
  onChildSelect?: (child: TourItem, parent: TourItem) => void
}

export default function ImprovedTourView({
  tours = [],
  museums = [],
  onItemSelect,
  onChildSelect,
}: ImprovedTourViewProps) {
  const [selectedItem, setSelectedItem] = useState<TourItem | null>(null)
  const [selectedChild, setSelectedChild] = useState<TourItem | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<"tours" | "museums">("tours")

  const handleItemClick = (item: TourItem) => {
    if (selectedItem?.uuid === item.uuid) {
      setSelectedItem(null)
      setSelectedChild(null)
    } else {
      setSelectedItem(item)
      setSelectedChild(null)
      onItemSelect?.(item)
    }
  }

  const handleChildClick = (child: TourItem, parent: TourItem) => {
    setSelectedChild(child)
    setSelectedItem(parent)
    onChildSelect?.(child, parent)
  }

  const toggleExpanded = (uuid: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(uuid)) {
      newExpanded.delete(uuid)
    } else {
      newExpanded.add(uuid)
    }
    setExpandedItems(newExpanded)
  }

  const renderItemCard = (item: TourItem, index: number) => {
    const isSelected = selectedItem?.uuid === item.uuid
    const isExpanded = expandedItems.has(item.uuid)
    const children = item.content?.[0]?.children || []
    const references = item.content?.[0]?.references || []
    const subItems = item.type === "tour" ? children : references

    return (
      <Card
        key={item.uuid}
        className={`mb-4 transition-all duration-300 hover:shadow-lg ${
          isSelected ? "ring-2 ring-blue-500 shadow-lg" : ""
        }`}
      >
        <CardHeader className="cursor-pointer" onClick={() => handleItemClick(item)}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge variant={item.type === "tour" ? "default" : "secondary"}>
                  {item.type === "tour" ? "Tour" : "Museum"}
                </Badge>
                <span className="text-sm text-muted-foreground">#{index + 1}</span>
              </div>
              <CardTitle className="text-lg font-semibold text-foreground hover:text-blue-600 transition-colors">
                {item.title}
              </CardTitle>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {item.description.replace(/<[^>]*>/g, "").substring(0, 120)}...
                </p>
              )}
            </div>
            {item.images?.[0]?.url && (
              <img
                src={item.images[0].url || "/placeholder.svg"}
                alt={item.title}
                className="w-16 h-16 object-cover rounded-lg ml-4"
              />
            )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {item.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>Location</span>
                </div>
              )}
              {item.content?.[0]?.audio?.[0] && (
                <div className="flex items-center gap-1">
                  <Play className="w-4 h-4" />
                  <span>Audio</span>
                </div>
              )}
              {subItems.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>
                    {subItems.length} {item.type === "tour" ? "stops" : "exhibits"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {subItems.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleExpanded(item.uuid)
                  }}
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </Button>
              )}
              <Button
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleItemClick(item)
                }}
              >
                {isSelected ? "Selected" : "View Details"}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && subItems.length > 0 && (
          <CardContent className="pt-0">
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                {item.type === "tour" ? "Tour Stops" : "Museum Exhibits"}
              </h4>
              <div className="space-y-2">
                {subItems.map((subItem, subIndex) => {
                  const isChildSelected = selectedChild?.uuid === subItem.uuid
                  return (
                    <div
                      key={subItem.uuid}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                        isChildSelected ? "bg-blue-50 border border-blue-200" : "hover:bg-muted/50"
                      }`}
                      onClick={() => handleChildClick(subItem, item)}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isChildSelected ? "bg-blue-500 text-white" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {subIndex + 1}
                      </div>
                      {subItem.images?.[0]?.url && (
                        <img
                          src={subItem.images[0].url || "/placeholder.svg"}
                          alt={subItem.title}
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{subItem.title}</p>
                        {subItem.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {subItem.description.replace(/<[^>]*>/g, "").substring(0, 60)}...
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    )
  }

  const renderDetailsPanel = () => {
    const currentItem = selectedChild || selectedItem
    if (!currentItem) {
      return (
        <Card className="h-full flex items-center justify-center">
          <CardContent className="text-center">
            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Select an item to view details</h3>
            <p className="text-muted-foreground">Choose a tour or museum from the list to see detailed information</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{currentItem.title}</CardTitle>
              {selectedChild && selectedItem && (
                <p className="text-sm text-muted-foreground mt-1">Part of: {selectedItem.title}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              {currentItem.affiliateLink && (
                <Button size="sm" asChild>
                  <a href={currentItem.affiliateLink} target="_blank" rel="noopener noreferrer">
                    <Info className="w-4 h-4 mr-2" />
                    More Info
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentItem.images?.[0]?.url && (
            <div className="aspect-video rounded-lg overflow-hidden">
              <img
                src={currentItem.images[0].url || "/placeholder.svg"}
                alt={currentItem.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {currentItem.content?.[0]?.audio?.[0] && (
            <div>
              <h4 className="font-medium mb-2">Audio Guide</h4>
              <audio controls src={currentItem.content[0].audio[0].url} className="w-full" />
            </div>
          )}

          {currentItem.description && (
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <div
                className="text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: currentItem.description }}
              />
            </div>
          )}

          {currentItem.location && (
            <div>
              <h4 className="font-medium mb-2">Location</h4>
              <div className="aspect-video rounded-lg overflow-hidden border">
                <iframe
                  src={`https://www.google.com/maps?q=${currentItem.location.latitude},${currentItem.location.longitude}&z=16&output=embed`}
                  className="w-full h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const activeItems = activeTab === "tours" ? tours : museums

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Tours & Museums</h1>
          <div className="flex gap-2">
            <Button variant={activeTab === "tours" ? "default" : "outline"} onClick={() => setActiveTab("tours")}>
              Tours ({tours.length})
            </Button>
            <Button variant={activeTab === "museums" ? "default" : "outline"} onClick={() => setActiveTab("museums")}>
              Museums ({museums.length})
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{activeTab === "tours" ? "Available Tours" : "Available Museums"}</h2>
            <div className="max-h-[800px] overflow-y-auto pr-2">
              {activeItems.length > 0 ? (
                activeItems.map((item, index) => renderItemCard(item, index))
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No {activeTab} available at the moment.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <div className="lg:sticky lg:top-8">{renderDetailsPanel()}</div>
        </div>
      </div>
    </div>
  )
}
