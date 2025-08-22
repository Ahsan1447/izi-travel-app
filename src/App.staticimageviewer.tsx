import React from 'react';
import TourDetailWidget from './app/components/TourDetailWidget';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Static Image Viewer - Travel App
        </h1>
        <TourDetailWidget />
      </div>
    </div>
  );
}

export default App;