import { useMemo } from 'react';

export function useItemData(selectedChild, selectedItem) {
  return useMemo(() => {
    if (!selectedChild && !selectedItem) return null;

    // Prefer selectedChild location if available, otherwise fallback to selectedItem location
    const location =
      selectedChild?.location && selectedChild.location.latitude && selectedChild.location.longitude
        ? selectedChild.location
        : selectedItem?.location && selectedItem.location.latitude && selectedItem.location.longitude
        ? selectedItem.location
        : null;

    const latitude = location?.latitude != null ? Number(location.latitude) : null;
    const longitude = location?.longitude != null ? Number(location.longitude) : null;

    const currentItem = selectedChild || selectedItem;
    const itemTitle = currentItem.title;
    const itemImage = currentItem.images?.[0]?.url;
    const itemAudio = currentItem.content?.[0]?.audio?.[0]?.url;
    const itemDescription = currentItem.description || "";
    const affiliateLink = selectedChild?.affiliateLink || selectedItem?.affiliateLink || "";

    return {
      location,
      latitude,
      longitude,
      currentItem,
      itemTitle,
      itemImage,
      itemAudio,
      itemDescription,
      affiliateLink
    };
  }, [selectedChild, selectedItem]);
}

export function useImageCollection(selectedChild, selectedItem) {
  return useMemo(() => {
    const currentItem = selectedChild || selectedItem;
    if (!currentItem) return [];

    const urls = [];
    const pushUrl = (u) => { if (u && typeof u === "string") urls.push(u); };
    
    try {
      (currentItem?.images || []).forEach(img => pushUrl(img?.url));
    } catch (_) {}
    
    try {
      (selectedChild?.images || []).forEach(img => pushUrl(img?.url));
    } catch (_) {}
    
    try {
      const children = selectedItem?.content?.[0]?.children || [];
      children.forEach(child => {
        (child?.images || []).forEach(img => pushUrl(img?.url));
      });
    } catch (_) {}
    
    const seen = new Set();
    return urls.filter(u => { 
      if (!u || seen.has(u)) return false; 
      seen.add(u); 
      return true; 
    });
  }, [selectedChild, selectedItem]);
}

export function useMapPoints(selectedItem) {
  return useMemo(() => {
    if (!selectedItem) return [];

    const content = selectedItem?.content?.[0] || {};
    const list = (content.children && content.children.length ? content.children : [])
      .filter((it) => (typeof it?.status === "string" ? it.status === "published" : true));
    
    return list
      .map((it, i) => ({
        lat: it?.location?.latitude != null ? Number(it.location.latitude) : null,
        lng: it?.location?.longitude != null ? Number(it.location.longitude) : null,
        title: it.title,
        uuid: it.uuid,
        index: i + 1,
        raw: it,
      }))
      .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  }, [selectedItem]);
}