import React from 'react';

export default function SharedDetailsView({ selectedChild, selectedItem, limitReached }) {
  if (limitReached) return null;
  if (!selectedChild && !selectedItem) return null;

  const currentItem = selectedChild || selectedItem;
  const itemTitle = currentItem.title;
  const itemImage = currentItem.images?.[0]?.url;
  const itemAudio = currentItem.content?.[0]?.audio?.[0]?.url;
  const itemDescription = currentItem.description || '';

  // Strictly use provided affiliateLink; no modification, no fallback
  const ctaLink = (selectedChild && selectedChild.affiliateLink)
    ? selectedChild.affiliateLink
    : (selectedItem && selectedItem.affiliateLink)
      ? selectedItem.affiliateLink
      : null;

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="flex flex-col items-center w-full">
        <h2 className="text-2xl font-bold mb-4 text-center text-purple-900">{itemTitle}</h2>
        
        {itemImage ? (
          <img src={itemImage} alt={itemTitle} className="w-full max-w-md mb-4 rounded shadow" />
        ) : (
          <div className="w-full max-w-md mb-4 flex items-center justify-center h-32 bg-gray-100 rounded shadow text-gray-400 text-lg font-semibold">N/A</div>
        )}
        
        {itemAudio && (
          <audio controls src={itemAudio} className="w-full mb-4" />
        )}
        
        <div className="text-gray-700 text-center mb-4 text-base leading-relaxed w-full">
          {itemDescription ? (
            <div className="max-h-24 overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: itemDescription }} />
          ) : (
            <p>No description available.</p>
          )}
        </div>
        
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
  );
}
