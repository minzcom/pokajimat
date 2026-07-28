/**
 * main.js — Legacy entry point (now just re-exports for compatibility)
 * The app has been restructured into:
 *   - guest.js  → public 360 viewer (index.html)
 *   - admin.js  → auth-gated studio (admin.html)
 *
 * This file is no longer the primary entry point.
 * It is kept only so any leftover references do not break.
 */

// Re-export common data functions for backward compatibility
export * from './data/firestore.js';
