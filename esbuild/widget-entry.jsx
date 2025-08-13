import React from 'react';
import { createRoot } from 'react-dom/client';
import TourDetailWidget from '../src/app/components/TourDetailWidget.jsx';

const cssUrl = (typeof window !== 'undefined' && window.__WIDGET_CSS_URL) || '/widget.css';
if (typeof document !== 'undefined') {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssUrl;
  document.head.appendChild(link);
}

let mountNode = document.getElementById('my-widget-root');
if (!mountNode && typeof document !== 'undefined') {
  mountNode = document.createElement('div');
  mountNode.id = 'my-widget-root';
  document.body.appendChild(mountNode);
}

let uuid = '';
let language = '';
if (typeof window !== 'undefined') {
  const currentScript = document.currentScript;
  if (currentScript && currentScript.getAttribute('data-uuid')) {
    uuid = currentScript.getAttribute('data-uuid');
  } else if (window.API_KEY) {
    uuid = window.API_KEY;
  } else {
    const params = new URLSearchParams(window.location.search);
    uuid = params.get('uuid') || '';
  }
  // if (currentScript && currentScript.getAttribute('data-language')) {
  //   language = currentScript.getAttribute('data-language');
  // } else if (window.IZI_TRAVEL_WIDGET_LANGUAGE) {
  //   language = window.IZI_TRAVEL_WIDGET_LANGUAGE;
  // } else {
  //   language = 'en';
  // }flatten
}

if (mountNode && uuid) {
  createRoot(mountNode).render(<TourDetailWidget uuid={uuid} language={language} />);
}
