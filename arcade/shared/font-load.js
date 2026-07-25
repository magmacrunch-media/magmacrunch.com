/* ═══════════════════════════════════════════════
   magmacrunch arcade — font loading helper
   font-load.js
   ═══════════════════════════════════════════════
   Prevents FOIT (flash of invisible text) by hiding
   body until Press Start 2P is ready.

   Usage in <head>:
     <style>.font-loading body{visibility:hidden}</style>
     <script src="../shared/font-load.js"></script>
   ═══════════════════════════════════════════════ */
document.documentElement.classList.add('font-loading');
document.fonts.ready.then(function () {
    document.documentElement.classList.remove('font-loading');
});
