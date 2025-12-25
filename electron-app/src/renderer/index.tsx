import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';  
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element. Check your index.html file.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
    <App />
);
