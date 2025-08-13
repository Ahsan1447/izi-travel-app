import React, { useEffect, useState } from 'react';
import SharedDetailsView from './SharedDetailsView';

export default function TourDetailWidget() {
  const apiKey = (typeof window !== 'undefined' && window.API_KEY) ? String(window.API_KEY) : '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [expandedIdx, setExpandedIdx] = useState({ type: null, idx: null });
  const [limitReached, setLimitReached] = useState(false);
  const [userData, setUserData] = useState(null);
  const [childDetailsCache, setChildDetailsCache] = useState({});
  const [fetchingChildDetails, setFetchingChildDetails] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserData(user)
      setLimitReached(user.limit_reach === true)
    }
  }, []);

  const handleViewDetails = (item, type = null, idx = null) => {
    if (limitReached) {
      setError('Your credit limit has been reached. Please upgrade your plan to continue viewing details.')
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
    setError('')
  }

  const handleSelectChild = async (child, item) => {
    if (limitReached) {
      setError('Your credit limit has been reached. Please upgrade your plan to continue viewing details.')
      return
    }
    
    // Check if we already have the details for this child
    if (childDetailsCache[child.uuid]) {
      setSelectedChild(childDetailsCache[child.uuid])
      setSelectedItem(item)
      setError('')
      return
    }
    
    // Fetch details for the child using DetailsMutation
    setFetchingChildDetails(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
          'Accept': 'application/izi-client-private-api-v1.0+json',
          'X-IZI-API-KEY': '350e8400-e29b-41d4-a716-446655440003',
          'Content-Type': 'application/json'
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
              languages: [child.language || "any"]
            }
          }
        })
      })
      
      const { data, errors } = await response.json()
      
      if (errors) {
        throw new Error(errors[0]?.message || 'Error fetching child details')
      }
      
      const childDetails = data?.mtgObjectDetails?.mtgObjectDetail
      
      if (childDetails) {
        // Cache the fetched details
        setChildDetailsCache(prev => ({
          ...prev,
          [child.uuid]: childDetails
        }))
        
        // Set the selected child with full details
        setSelectedChild(childDetails)
        setSelectedItem(item)
      } else {
        throw new Error('No details found for this item')
      }
      
    } catch (err) {
      setError(err.message || 'Failed to fetch child details')
      // Fallback to showing basic child info
      setSelectedChild(child)
      setSelectedItem(item)
    } finally {
      setFetchingChildDetails(false)
    }
  }

  const handleTitleClick = (item, type, idx) => {
    if (limitReached) {
      setError('Your credit limit has been reached. Please upgrade your plan to continue viewing details.')
      return
    }
    
    setExpandedIdx(expandedIdx.type === type && expandedIdx.idx === idx ? { type: null, idx: null } : { type, idx })
    // Toggle tour details - if same tour is clicked, hide it
    if (selectedItem && selectedItem.uuid === item.uuid) {
      setSelectedItem(null);
      setSelectedChild(null);
    } else {
      setSelectedItem(item);
      setSelectedChild(null);
    }
    setError('') 
  }

  useEffect(() => {
    if (!apiKey) return;
    setLoading(true);
    setError('');

    // Single bulk mutation call using apiKey only
    fetch('http://localhost:3000/graphql', {
      method: 'POST',
      headers: {
        'Accept': 'application/izi-client-private-api-v1.0+json',
        'X-IZI-API-KEY': '350e8400-e29b-41d4-a716-446655440003',
        'Content-Type': 'application/json'
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
                  }
                }
              }
            }
          }
        `,
        variables: { input: { widgetApiKey: apiKey } }
      })
    })
      .then(res => res.json())
      .then(({ data, errors }) => {
        if (errors) throw new Error(errors[0]?.message || 'Error');
        const items = data?.bulkMtgObjectDetails?.data || [];
        // Determine limit from response (supports boolean or object)
        const anyLimit = items.find(i => typeof i?.userLimit !== 'undefined');
        const limit = typeof anyLimit?.userLimit === 'object'
          ? Boolean(anyLimit.userLimit?.limitReached)
          : Boolean(anyLimit?.userLimit);
        setLimitReached(limit);
        setResults(items.filter(r => r && r.status === 'published'));
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch results');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [apiKey]);

  const tours = results.filter(r => r?.type === 'tour' && r.status === 'published');
  const museums = results.filter(r => r?.type === 'museum' && r.status === 'published');

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
                You have reached your credit limit and cannot view detailed information. 
                Please upgrade your plan to continue accessing tour and museum details.
              </p>
            </div>
          </div>
        )}
        
        {loading && <div className="text-gray-600 p-4 text-center text-lg">Loading...</div>}

        {/* Show tours and museums in a single unified list */}
        {!loading && !error && (
          <div className="w-1/3 max-w-md mr-4">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Tour & Museum List</h2>
            <div className="bg-white rounded-lg overflow-y-auto max-h-96 border border-gray-300 shadow-sm">
              {/* Tours Section */}
              {tours.length > 0 && (
                <div>
                  {tours.map((item, idx) => (
                    <div key={item.uuid}>
                      <div className="flex justify-between items-center border-b border-gray-200 p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold cursor-pointer text-gray-800" onClick={() => handleTitleClick(item, 'tour', idx)}>
                            {item.title}
                          </span>
                        </div>
                        <button
                          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-1 rounded text-sm"
                          onClick={() => handleViewDetails(item, 'tour', idx)}
                        >
                          Visit Tour
                        </button>
                      </div>
                      {/* Children list below the selected tour */}
                      {expandedIdx.type === 'tour' && expandedIdx.idx === idx && (
                        <div className="bg-gray-50 px-6 py-2 border-l-4 border-purple-500">
                          <div className="font-semibold text-purple-700 mb-2">Children</div>
                          {(item.content?.[0]?.children?.length > 0) ? (
                            <ul className="mb-2">
                              {item.content[0].children.map((child, cidx) => (
                                <li key={cidx} className="py-2 border-b border-gray-200 last:border-b-0">
                                  <div 
                                    className={`flex items-center gap-2 cursor-pointer py-1 px-2 rounded transition-colors ${
                                      selectedChild && selectedChild.uuid === child.uuid 
                                        ? 'bg-blue-500 text-white' 
                                        : 'hover:text-purple-600'
                                    }`}
                                    onClick={() => handleSelectChild(child, item)}
                                  >
                                    {child.images?.[0]?.url && <img src={child.images[0].url} alt={child.title} className="w-6 h-6 object-cover rounded" />}
                                    <span className="font-medium">{child.title || 'No title'}</span>
                                    {fetchingChildDetails && selectedChild && selectedChild.uuid === child.uuid && (
                                      <span className="ml-2 text-xs text-blue-600">Loading...</span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
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
                      <div className="flex justify-between items-center border-b border-gray-200 p-4 hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold cursor-pointer text-gray-800" onClick={() => handleTitleClick(item, 'museum', idx)}>
                            {item.title}
                          </span>
                        </div>
                        <button
                          className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-4 py-1 rounded text-sm"
                          onClick={() => handleViewDetails(item, 'museum', idx)}
                        >
                          Visit Museum
                        </button>
                      </div>
                      {/* References list below the selected museum */}
                      {expandedIdx.type === 'museum' && expandedIdx.idx === idx && (
                        <div className="bg-gray-50 px-6 py-2 border-l-4 border-purple-500">
                          <div className="font-semibold text-purple-700 mb-2">References</div>
                          {(item.content[0]?.references?.length > 0) ? (
                            <ul className="mb-2">
                              {item.content[0].references.map((ref, ridx) => (
                                <li key={ridx} className="py-2 border-b border-gray-200 last:border-b-0">
                                  <div 
                                    className={`flex items-center gap-2 cursor-pointer py-1 px-2 rounded transition-colors ${
                                      selectedChild && selectedChild.uuid === ref.uuid 
                                        ? 'bg-blue-500 text-white' 
                                        : 'hover:text-purple-600'
                                    }`}
                                    onClick={() => handleSelectChild(ref, item)}
                                  >
                                    {ref.images?.[0]?.url && <img src={ref.images[0].url} alt={ref.title} className="w-6 h-6 object-cover rounded" />}
                                    <span className="font-medium">{ref.title || 'No title'}</span>
                                    {fetchingChildDetails && selectedChild && selectedChild.uuid === ref.uuid && (
                                      <span className="ml-2 text-xs text-blue-600">Loading...</span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
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
                <div className="p-4 text-center text-gray-500">
                  No published tours or museums found.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Show details on the right side */}
        {selectedChild || selectedItem ? (
          <div className="absolute top-14 right-25 w-1/3 h-[30vh] transition-all duration-300 overflow-y-auto">
            <SharedDetailsView selectedChild={selectedChild} selectedItem={selectedItem} limitReached={limitReached} />
          </div>
        ) : null}
      </div>
    </main>
  );
}
