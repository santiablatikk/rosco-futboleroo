/**
 * Mobile Detector for PASALA CHE
 * 
 * This script detects if the user is on a mobile device and redirects
 * to the mobile-optimized version of the game automatically.
 */

(function() {
  function isMobileDevice() {
    // Check if the user agent string contains mobile indicators
    const mobileKeywords = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    // Check screen width (common mobile breakpoint is 768px)
    const isMobileWidth = window.innerWidth <= 768;
    
    // Check if touch is the primary input method
    const isTouchDevice = ('ontouchstart' in window) || 
                         (navigator.maxTouchPoints > 0) ||
                         (navigator.msMaxTouchPoints > 0);
    
    return mobileKeywords.test(navigator.userAgent) || (isMobileWidth && isTouchDevice);
  }

  function redirectToMobileVersion() {
    // Only redirect if we're on the game page and not already on the mobile version
    const currentPath = window.location.pathname;
    if (currentPath.includes('game.html') && !currentPath.includes('game-mobile.html')) {
      // Get the current page URL and replace with mobile version
      const currentUrl = window.location.href;
      const mobileUrl = currentUrl.replace('game.html', 'game-mobile.html');
      
      // Redirect to the mobile version
      window.location.href = mobileUrl;
    }
  }

  // Run the detection when page loads
  document.addEventListener('DOMContentLoaded', function() {
    if (isMobileDevice()) {
      redirectToMobileVersion();
    }
  });
})(); 