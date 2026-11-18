/* ===================== Shared app state ===================== */
/* Loaded first — every other script reads/writes this global object. */
var state = { mode: 'magic', data: null, currentLink: null };
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
