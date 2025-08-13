import React from 'react';
import { createRoot } from 'react-dom/client';
import TourDetailWidget from './src/app/components/TourDetailWidget.jsx';

const uuid = window.IZI_TRAVEL_WIDGET || '';

const mountNode = document.getElementById('my-widget-root');
if (mountNode && uuid) {
  createRoot(mountNode).render(<TourDetailWidget uuid={uuid} />);
}

// To use:
// 1. Add <div id="my-widget-root"></div> to your external page
// 2. Set window.IZI_TRAVEL_WIDGET_UUID = 'your-uuid' before loading widget.js
// 3. Add <script src="/widget.js"></script>
// Only the tour card widget will be rendered, not the whole app.
