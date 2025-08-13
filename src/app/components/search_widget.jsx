'use client'

import React, { useState, useEffect } from 'react'
import SharedDetailsView from './SharedDetailsView'

import LANGUAGE_NAMES from '../search/constants/languages'

const languageOptions = Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
  code,
  name
}))

export default function SearchWidget() {
  const [searchTerm, setSearchTerm] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [debounceTimeout, setDebounceTimeout] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [region, setRegion] = useState('')
  const [languages, setLanguages] = useState(['any'])
  const [showLangDropdown, setShowLangDropdown] = useState(false)
  const [langSearch, setLangSearch] = useState('')
  const [results, setResults] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [selectedChild, setSelectedChild] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedTourIdx, setExpandedTourIdx] = useState(null)
  const [expandedMuseumIdx, setExpandedMuseumIdx] = useState(null)
  const [expandedIdx, setExpandedIdx] = useState({ type: null, idx: null });
  const [limitReached, setLimitReached] = useState(false)
  const [userData, setUserData] = useState(null)
  const [selectedUuids, setSelectedUuids] = useState({})
  const [isSavingCollection, setIsSavingCollection] = useState(false)
  const [storedApiKey, setStoredApiKey] = useState('')

  // Check user limit on component mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserData(user)
      setLimitReached(user.limit_reach === true)
    }
  }, [])

  // Function to handle view details with limit check
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
    setError('') // Clear any previous errors
  }

  // Function to handle child/reference selection with limit check
  const handleSelectChild = (child, item) => {
    if (limitReached) {
      setError('Your credit limit has been reached. Please upgrade your plan to continue viewing details.')
      return
    }
    
    setSelectedChild(child)
    setSelectedItem(item)
    setError('') // Clear any previous errors
  }

  const toggleLanguage = (code) => {
    if (code === 'any') {
      setLanguages(['any'])
    } else {
      setLanguages(prev => {
        const newList = prev.includes(code)
          ? prev.filter(l => l !== code)
          : [...prev.filter(l => l !== 'any'), code]
        return newList.length ? newList : ['any']
      })
    }
  }

  const fetchSuggestions = async (term) => {
    setLoading(true)
    setError('')
    try {
      const input = {
        limit: 10,
        offset: 0,
        query: term.trim(),
        region: region.trim(),
        type: 'tour,museum',
        queryFilters: ['title', 'description'],
        languages
      }
      const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
          'Accept': 'application/izi-client-private-api-v1.0+json',
          'X-IZI-API-KEY': '350e8400-e29b-41d4-a716-446655440003',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `
            mutation SearchAttraction($input: SearchAttractionMutationInput!) {
              search(input: $input) {
                data {
                  status
                  uuid
                  title
                  description
                  language
                  images { url }
                  type
                  content {
                    audio { url }
                    references {
                      affiliateLink
                      title
                      description
                      images { url }
                      content { audio { url } }
                    }
                    children {
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
          variables: { input }
        })
      })
      const { data, errors } = await response.json()
      if (errors) throw new Error(errors[0].message)
      const filtered = (data?.search?.data || []).filter(item => item.status === 'published')
      setResults(filtered)
    } catch (err) {
      setError(err.message || 'Failed to fetch suggestions')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (uuid) => {
    setSelectedUuids(prev => ({ ...prev, [uuid]: !prev[uuid] }))
  }

  const buildSelectedLanguageMap = () => {
    const langMap = {}
    results.forEach(item => {
      if (!selectedUuids[item.uuid]) return
      const lang = item.language
      if (!lang) return
      if (!langMap[lang]) langMap[lang] = []
      langMap[lang].push(item.uuid)
    })
    return langMap
  }

  const createWidget = async () => {
    const payload = buildSelectedLanguageMap()
    if (Object.keys(payload).length === 0) return
    if (!userData?.id) {
      setError('Please sign in to store a collection')
      return
    }
    setIsSavingCollection(true)
    try {
      const response = await fetch('http://localhost:3000/graphql', {
        method: 'POST',
        headers: {
          'Accept': 'application/izi-client-private-api-v1.0+json',
          'X-IZI-API-KEY': '350e8400-e29b-41d4-a716-446655440003',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: `mutation CreateWidgetMutation($input: CreateWidgetMutationInput!) {\n  createWidget(input: $input) {\n    response\n  }\n}`,
          variables: {
            input: {
              userEmail: userData.email,
              widget: payload
            }
          }
        })
      })

      if (response.ok) {
        const json = await response.json().catch(() => null)
        const apiKey = json?.data?.createWidget?.response?.api_key
        if (apiKey) {
          setStoredApiKey(apiKey)
          return
        }
      }
      setError('Failed to store collection')
    } catch (_) {
      setError('Failed to store collection')
    } finally {
      setIsSavingCollection(false)
    }
  }

  const handleSelectSuggestion = (item) => {
    setSelectedItem(item)
    setShowSuggestions(false)
    setSuggestions([])
    setSearchTerm(item.title)
    setSelectedChild(null)
  }

  const renderTourCard = (item, idx, isExpanded, onExpand) => (
    <div key={item.title} className="flex flex-col gap-2 p-4 border-b border-gray-300">
      <div className="flex justify-between items-center cursor-pointer hover:bg-gray-700" onClick={() => onExpand(idx)}>
        <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
          onClick={e => {
            e.stopPropagation();
            setSelectedItem(selectedItem && selectedItem.title === item.title ? null : item);
            setSelectedChild(null);
          }}
        >
          View Details
        </button>
      </div>
      {isExpanded && item.children?.length > 0 && (
        <div className="ml-4 mt-2">
          <div className="font-semibold text-sm mb-1">Stories:</div>
          <ul className="list-disc pl-4">
            {item.children.map((child, i) => (
              <li
                key={i}
                className="mb-1 flex items-center cursor-pointer hover:text-purple-400"
                onClick={() => { setSelectedChild(child); }}
              >
                {child.images?.[0]?.url && (
                  <img src={child.images[0].url} alt={child.title} className="w-8 h-8 object-cover rounded mr-2" />
                )}
                {child.title || 'No title'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const renderMuseumCard = (item, idx, isExpanded, onExpand) => (
    <div key={item.title} className="flex flex-col gap-2 p-4 border-b border-gray-300">
      <div className="flex justify-between items-center cursor-pointer hover:bg-gray-700" onClick={() => onExpand(idx)}>
        <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
          onClick={e => {
            e.stopPropagation();
            setSelectedItem(selectedItem && selectedItem.title === item.title ? null : item);
            setSelectedChild(null);
          }}
        >
          View Details
        </button>
      </div>
      {isExpanded && item.references?.length > 0 && (
        <div className="ml-4 mt-2">
          <div className="font-semibold text-sm mb-1">References:</div>
          <ul className="list-disc pl-4">
            {item.references.map((ref, i) => (
              <li key={i} className="mb-2 flex items-center">
                {ref.images?.[0]?.url && (
                  <img src={ref.images[0].url} alt={ref.title} className="w-8 h-8 object-cover rounded mr-2" />
                )}
                <span className="cursor-pointer hover:text-purple-400" onClick={() => setSelectedChild(ref)}>
                  {ref.title || 'No title'}
                </span>
                <button
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs ml-2"
                  onClick={e => { e.stopPropagation(); setSelectedChild(ref); }}
                >
                  View Details
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )

  const tours = results.filter(r => r.type === 'tour' && r.status === 'published')
  const museums = results.filter(r => r.type === 'museum' && r.status === 'published')

  return (
    <main className="wrapper min-h-screen bg-gray-100 text-gray-800">
      <div className="w-full max-w-full mx-auto px-8 py-6 relative">
        <form onSubmit={e => { e.preventDefault(); fetchSuggestions(searchTerm); }} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div>
            <label className="block text-sm mb-1 text-gray-700">Tour or Museum name</label>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded bg-white text-black border border-gray-300"
              placeholder="Type to search..."
              autoComplete="off"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-700">City</label>
            <input
              value={region}
              onChange={e => setRegion(e.target.value)}
              className="w-full px-4 py-2 rounded bg-white text-black border border-gray-300"
              placeholder="e.g. Den Haag"
            />
          </div>
          <div className="relative">
            <label className="block text-sm mb-1 text-gray-700">Select Languages</label>
            <button
              type="button"
              onClick={() => setShowLangDropdown(!showLangDropdown)}
              className="w-full px-4 py-2 rounded bg-white text-black text-left border border-gray-300"
            >
              {languages.includes('any') ? 'Any' : languages.map(l => LANGUAGE_NAMES[l]).join(', ') || 'Select'}
            </button>
            {showLangDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white text-black rounded border border-gray-300 max-h-56 overflow-y-auto">
                <input
                  type="text"
                  value={langSearch}
                  onChange={e => setLangSearch(e.target.value)}
                  placeholder="Search language (e.g. English, Hindi)"
                  className="w-full px-3 py-2 mb-1 border-b border-gray-300 bg-gray-50 text-black rounded-t"
                  autoFocus
                />
                {[{ code: 'any', name: 'Any' }, ...languageOptions.filter(opt =>
                  !langSearch.trim() || opt.name.toLowerCase().includes(langSearch.trim().toLowerCase())
                )].map(({ code, name }) => (
                  <div key={code} className="flex items-center px-3 py-1 hover:bg-gray-100">
                    <input
                      type="checkbox"
                      checked={languages.includes(code)}
                      onChange={() => toggleLanguage(code)}
                      className="mr-2"
                    />
                    <label>{name}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
        
        {/* Removed user welcome/credit limit banner as requested */}
        
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
        {/* Show tours and museums in a single unified list */}
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
                        <input
                          type="checkbox"
                          checked={!!selectedUuids[item.uuid]}
                          onChange={() => toggleSelection(item.uuid)}
                          className="text-purple-600"
                        />
                                              <span className="font-semibold cursor-pointer text-gray-800" onClick={() => {
                        if (!limitReached) {
                          setExpandedIdx(expandedIdx.type === 'tour' && expandedIdx.idx === idx ? { type: null, idx: null } : { type: 'tour', idx });
                          // Toggle tour details - if same tour is clicked, hide it
                          if (selectedItem && selectedItem.uuid === item.uuid) {
                            setSelectedItem(null);
                            setSelectedChild(null);
                          } else {
                            setSelectedItem(item);
                            setSelectedChild(null);
                          }
                        }
                      }}>{item.title}</span>
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
                                    selectedChild && selectedChild.title === child.title 
                                      ? 'bg-blue-500 text-white' 
                                      : 'hover:text-purple-600'
                                  }`}
                                  onClick={() => handleSelectChild(child, item)}
                                >
                                  {child.images?.[0]?.url && <img src={child.images[0].url} alt={child.title} className="w-6 h-6 object-cover rounded" />}
                                  <span className="font-medium">{child.title || 'No title'}</span>
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
                        <input
                          type="checkbox"
                          checked={!!selectedUuids[item.uuid]}
                          onChange={() => toggleSelection(item.uuid)}
                          className="text-purple-600"
                        />
                        <span className="font-semibold cursor-pointer text-gray-800" onClick={() => {
                          if (!limitReached) {
                            setExpandedIdx(expandedIdx.type === 'museum' && expandedIdx.idx === idx ? { type: null, idx: null } : { type: 'museum', idx });
                            // Toggle museum details - if same museum is clicked, hide it
                            if (selectedItem && selectedItem.uuid === item.uuid) {
                              setSelectedItem(null);
                              setSelectedChild(null);
                            } else {
                              setSelectedItem(item);
                              setSelectedChild(null);
                            }
                          }
                        }}>{item.title}</span>
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
                        {(item.content?.[0]?.references?.length > 0) ? (
                          <ul className="mb-2">
                            {item.content[0].references.map((ref, ridx) => (
                              <li key={ridx} className="py-2 border-b border-gray-200 last:border-b-0">
                                <div 
                                  className={`flex items-center gap-2 cursor-pointer py-1 px-2 rounded transition-colors ${
                                    selectedChild && selectedChild.title === ref.title 
                                      ? 'bg-blue-500 text-white' 
                                      : 'hover:text-purple-600'
                                  }`}
                                  onClick={() => handleSelectChild(ref, item)}
                                >
                                  {ref.images?.[0]?.url && <img src={ref.images[0].url} alt={ref.title} className="w-6 h-6 object-cover rounded" />}
                                  <span className="font-medium">{ref.title || 'No title'}</span>
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
        
        {/* Show details on the right side */}
        {selectedChild || selectedItem ? (
          <div className={`absolute right-0 w-1/2 h-[40vh] transition-all duration-300 ${
            selectedChild ? 'top-40' : 'top-40'
          }`}>
            <SharedDetailsView selectedChild={selectedChild} selectedItem={selectedItem} limitReached={limitReached} />
          </div>
        ) : null}

        <div className="mt-8 mb-4 flex items-center gap-4">
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded disabled:opacity-60"
            onClick={createWidget}
            disabled={isSavingCollection || Object.values(selectedUuids).every(v => !v)}
          >
            {isSavingCollection ? 'Creating...' : 'Create Widget'}
          </button>
          <span className="text-sm text-gray-600">
            Selected: {Object.values(selectedUuids).filter(Boolean).length}
          </span>
          
        </div>
        {/* Widget embed code (use API key only; do not add IZI_TRAVEL_WIDGET) */}
        {storedApiKey && (
          <div className="mt-12 w-full flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4 text-purple-700">Embed Travel Widget</h2>
            <div className="relative w-full max-w-2xl">
              <pre id="embed-code-all" className="bg-gray-900 text-white p-4 rounded mb-4 overflow-x-auto text-sm select-all">
{`<div id="my-widget-root"></div>
<script>
  window.API_KEY = "${storedApiKey}";
<\/script>
<link rel="stylesheet" href="http://localhost:3000/widget.css">
<script src="http://localhost:3000/widget.js"><\/script>`}
              </pre>
              <button
                className="absolute top-2 right-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs"
                onClick={() => {
                  const code = `<div id=\"my-widget-root\"></div>\n<script>\n  window.API_KEY = \"${storedApiKey}\";\n<\/script>\n<link rel=\"stylesheet\" href=\"http://localhost:3000/widget.css\">\n<script src=\"http://localhost:3000/widget.js\"><\/script>`;
                  navigator.clipboard.writeText(code.replace(/\\n/g, '\n'));
                }}
              >Copy</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
