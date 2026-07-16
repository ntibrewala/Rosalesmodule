// File: src/components/Toast.jsx
import React from 'react';

// Simple toast utility using browser alert for demo purposes
// In production replace with a proper toast library (e.g., react-hot-toast)

export const Toast = {
  success: (msg) => alert(`✅ ${msg}`),
  error: (msg) => alert(`❌ ${msg}`),
  info: (msg) => alert(`ℹ️ ${msg}`),
};

export default Toast;
