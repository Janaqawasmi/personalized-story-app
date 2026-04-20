/**
 * Centralized z-index constants for fixed / overlay UI layers.
 *
 * MUI reference values (for context only):
 * - appBar: 1100
 * - modal: 1300
 * - snackbar: 1400
 * - tooltip: 1500
 */

/** Main navbar AppBar. Sits above page content and most overlays below modals. */
export const Z_INDEX_NAVBAR = 1300;

/** Mega menu dropdown panel. Must appear above the navbar it attaches to. */
export const Z_INDEX_MEGA_MENU_PANEL = 1301;

/** Search overlay backdrop. Must sit above page content but below the navbar. */
export const Z_INDEX_SEARCH_OVERLAY_BACKDROP = 1200;

/** Search overlay panel. Must sit above its backdrop but still below the navbar. */
export const Z_INDEX_SEARCH_OVERLAY_PANEL = 1201;

/**
 * Complexity meter (fixed bottom). Kept at the historical effective value
 * (previously `theme.zIndex.appBar` = 1100) to avoid any visual changes.
 * Must remain below snackbars/toasts.
 */
export const Z_INDEX_COMPLEXITY_METER = 1100;

/** Fullscreen book reader top controls (fixed). Kept at historical value. */
export const Z_INDEX_BOOK_READER_TOP_CONTROLS = 1300;

/** MUI Snackbar default. Included so toasts remain the topmost non-modal layer. */
export const Z_INDEX_SNACKBAR = 1400;

