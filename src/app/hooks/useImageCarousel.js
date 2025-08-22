import { useState, useEffect } from 'react';

export function useImageCarousel(imageUrls, selectedItem, selectedChild, selectionVersion) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const totalImages = imageUrls.length;

  useEffect(() => { 
    setCurrentIdx(0); 
  }, [selectedItem?.uuid, selectedChild?.uuid, selectionVersion]);

  const goNext = () => {
    if (!totalImages) return;
    setCurrentIdx((prevIdx) => (prevIdx + 1) % totalImages);
  };

  const goPrev = () => {
    if (!totalImages) return;
    setCurrentIdx((prevIdx) => (prevIdx - 1 + totalImages) % totalImages);
  };

  return {
    currentIdx,
    totalImages,
    goNext,
    goPrev
  };
}