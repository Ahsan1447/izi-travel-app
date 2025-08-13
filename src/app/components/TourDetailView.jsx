import React from 'react';

export default function TourDetailView({ tour, items, selectedChild, onSelectChild }) {
  if (!tour) return <div className="tw-text-gray-500 tw-p-4">Tour not found.</div>;

  const isTour = tour.type === 'tour';
  const detail = selectedChild || items[0] || null;

  return (
    <main className="wrapper min-h-screen bg-[#24194b] text-white">
      <div className="w-full max-w-full mx-auto px-8 py-6">
        <div className="mt-6 flex flex-row gap-8 w-full">
          {/* Sidebar: Stories/References */}
          <div className="w-80 min-w-64 border-r border-gray-400 pr-6">
            <h3 className="text-xl font-bold mb-6 text-white text-center">{isTour ? 'Stories' : 'References'}</h3>
            <div className="space-y-3">
              {items.length > 0 ? (
                items.map((item, i) => (
                  <div key={i}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${detail === item ? 'bg-purple-200 text-purple-900 font-bold' : 'bg-transparent text-white font-semibold'}`}
                    onClick={() => onSelectChild(item)}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold ${detail === item ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'}`}>{i + 1}</div>
                    <span className="flex-1 truncate">{item.title}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-400 text-center py-4">
                  {isTour ? 'No stories available.' : 'No references available.'}
                </div>
              )}
            </div>
          </div>
          {/* Main detail area */}
          <div className="flex-1 flex items-center justify-center">
            {detail ? (
              <div className="mt-8 w-full flex flex-col items-center">
                <div className="p-8 rounded-lg bg-white shadow flex flex-col items-center w-full max-w-2xl">
                  <h2 className="text-2xl font-bold mb-4 text-center text-purple-900">{detail ? detail.title : tour.title}</h2>
                  {(detail ? detail.images?.[0]?.url : tour.images?.[0]?.url) ? (
                    <img src={detail ? detail.images[0].url : tour.images[0].url} alt={detail ? detail.title : tour.title} className="w-full max-w-xs mb-4 rounded shadow" />
                  ) : (
                    <div className="w-full max-w-xs mb-4 flex items-center justify-center h-32 bg-gray-100 rounded shadow text-gray-400 text-lg font-semibold">N/A</div>
                  )}
                  {(detail ? detail.content?.[0]?.audio?.[0]?.url : tour.content?.[0]?.audio?.[0]?.url) && (
                    <audio controls src={detail ? detail.content[0].audio[0].url : tour.content[0].audio[0].url} className="w-full mb-4" />
                  )}
                  <p className="text-gray-700 text-center mb-4">{detail ? (detail.description || 'No description available.') : (tour.description || 'No description available.')}</p>
                  {(detail ? detail.affiliateLink : tour.affiliateLink) && (
                    <a href={detail ? detail.affiliateLink : tour.affiliateLink} target="_blank" rel="noopener noreferrer" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow text-sm font-medium mt-2">Visit Affiliate Page</a>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-lg bg-white shadow flex flex-col items-center w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4 text-center text-purple-900">{tour.title}</h2>
                <div className="w-full max-w-xs mb-4 flex items-center justify-center h-32 bg-gray-100 rounded shadow text-gray-400 text-lg font-semibold">N/A</div>
                <p className="text-gray-700 text-center mb-4">No description available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
