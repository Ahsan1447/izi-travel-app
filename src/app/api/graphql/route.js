export async function POST(request) {
  try {
    const { query, variables } = await request.json()

    // Mock data for travel locations
    const mockLocations = [
      {
        id: '1',
        name: 'Paris',
        description: 'The City of Light, famous for its art, fashion, gastronomy and culture.',
        country: 'France',
        type: 'City'
      },
      {
        id: '2',
        name: 'Tokyo',
        description: 'A bustling metropolis that mixes the ultramodern with the traditional.',
        country: 'Japan',
        type: 'City'
      },
      {
        id: '3',
        name: 'New York',
        description: 'The Big Apple, a global center of finance, culture, and entertainment.',
        country: 'USA',
        type: 'City'
      },
      {
        id: '4',
        name: 'Bali',
        description: 'A paradise island known for its beautiful beaches and spiritual culture.',
        country: 'Indonesia',
        type: 'Island'
      },
      {
        id: '5',
        name: 'Santorini',
        description: 'Famous for its stunning sunsets, white-washed buildings, and blue domes.',
        country: 'Greece',
        type: 'Island'
      },
      {
        id: '6',
        name: 'Machu Picchu',
        description: 'Ancient Incan citadel set high in the Andes Mountains.',
        country: 'Peru',
        type: 'Historical Site'
      },
      {
        id: '7',
        name: 'Great Barrier Reef',
        description: 'The world\'s largest coral reef system, a UNESCO World Heritage site.',
        country: 'Australia',
        type: 'Natural Wonder'
      },
      {
        id: '8',
        name: 'Swiss Alps',
        description: 'Mountain range offering world-class skiing and breathtaking scenery.',
        country: 'Switzerland',
        type: 'Mountain Range'
      }
    ]

    // Simple search implementation
    if (query.includes('searchLocations')) {
      const searchTerm = variables.term.toLowerCase()
      const filteredResults = mockLocations.filter(location =>
        location.name.toLowerCase().includes(searchTerm) ||
        location.description.toLowerCase().includes(searchTerm) ||
        location.country.toLowerCase().includes(searchTerm) ||
        location.type.toLowerCase().includes(searchTerm)
      )

      return Response.json({
        data: {
          searchLocations: filteredResults
        }
      })
    }

    return Response.json({
      errors: [{ message: 'Query not supported' }]
    }, { status: 400 })

  } catch (error) {
    return Response.json({
      errors: [{ message: 'Internal server error' }]
    }, { status: 500 })
  }
} 