/**
 * Utility functions for PASALA CHÉ - El Rosco Futbolero
 */

// Function to try loading an image with multiple extensions (jpg, jpeg, webp)
function loadImageWithFallback(imagePath, altText, className) {
  // Get the base path without extension
  const basePath = imagePath.replace(/\.(jpg|jpeg|webp)$/, '');
  
  // Create a new image element
  const img = document.createElement('img');
  img.alt = altText || 'Imagen';
  if (className) {
    img.className = className;
  }
  
  // First try with the original path
  img.src = imagePath;
  
  // Handle errors - try alternative extensions
  img.onerror = function() {
    // Try different extensions based on original extension
    if (imagePath.toLowerCase().endsWith('.jpg')) {
      // Try jpeg then webp
      this.src = basePath + '.jpeg';
      this.onerror = function() {
        this.src = basePath + '.webp';
        this.onerror = fallbackToPlaceholder;
      };
    } 
    else if (imagePath.toLowerCase().endsWith('.jpeg')) {
      // Try jpg then webp
      this.src = basePath + '.jpg';
      this.onerror = function() {
        this.src = basePath + '.webp';
        this.onerror = fallbackToPlaceholder;
      };
    }
    else if (imagePath.toLowerCase().endsWith('.webp')) {
      // Try jpg then jpeg
      this.src = basePath + '.jpg';
      this.onerror = function() {
        this.src = basePath + '.jpeg';
        this.onerror = fallbackToPlaceholder;
      };
    }
    else {
      // If no known extension, try all formats
      this.src = basePath + '.jpg';
      this.onerror = function() {
        this.src = basePath + '.jpeg';
        this.onerror = function() {
          this.src = basePath + '.webp';
          this.onerror = fallbackToPlaceholder;
        };
      };
    }
  };
  
  // Final fallback to placeholder
  function fallbackToPlaceholder() {
    // Extract dimensions from the placeholder in the original onerror handler
    let placeholderDimensions = '400x225';
    let placeholderText = 'Image';
    
    // Try to get the original placeholder if set
    const originalOnError = this.getAttribute('data-original-onerror');
    if (originalOnError) {
      const match = originalOnError.match(/(\d+)x(\d+)/);
      if (match) {
        placeholderDimensions = match[0];
      }
      
      const textMatch = originalOnError.match(/text=([^'&]+)/);
      if (textMatch) {
        placeholderText = textMatch[1];
      }
    }
    
    this.src = `https://via.placeholder.com/${placeholderDimensions}?text=${placeholderText}`;
  }
  
  return img;
}

// Function to update all image tags on a page to support multiple formats
function updateAllImagesForMultipleFormats() {
  // Get all images on the page with common image extensions
  const images = document.querySelectorAll('img[src*=".jpg"], img[src*=".jpeg"], img[src*=".webp"]');
  
  images.forEach(img => {
    // Store the original onerror handler
    if (img.onerror) {
      img.setAttribute('data-original-onerror', img.onerror.toString());
    }
    
    const originalSrc = img.src;
    const basePath = originalSrc.replace(/\.(jpg|jpeg|webp)$/, '');
    
    // Set up the fallback function
    img.onerror = function() {
      // Check original extension and try alternatives
      if (originalSrc.toLowerCase().endsWith('.jpg')) {
        // Try jpeg then webp
        this.src = basePath + '.jpeg';
        this.onerror = function() {
          this.src = basePath + '.webp';
          this.onerror = usePlaceholder;
        };
      } 
      else if (originalSrc.toLowerCase().endsWith('.jpeg')) {
        // Try jpg then webp
        this.src = basePath + '.jpg';
        this.onerror = function() {
          this.src = basePath + '.webp';
          this.onerror = usePlaceholder;
        };
      }
      else if (originalSrc.toLowerCase().endsWith('.webp')) {
        // Try jpg then jpeg
        this.src = basePath + '.jpg';
        this.onerror = function() {
          this.src = basePath + '.jpeg';
          this.onerror = usePlaceholder;
        };
      }
      else {
        // If no recognized extension, try common formats
        this.src = basePath + '.jpg';
        this.onerror = function() {
          this.src = basePath + '.jpeg';
          this.onerror = function() {
            this.src = basePath + '.webp';
            this.onerror = usePlaceholder;
          };
        };
      }
    };
    
    // Function to use placeholder as final fallback
    function usePlaceholder() {
      const originalOnError = this.getAttribute('data-original-onerror');
      if (originalOnError && originalOnError.includes('this.src=')) {
        // Extract the placeholder URL from the original onerror
        const placeholderMatch = originalOnError.match(/'(https:\/\/via\.placeholder\.com\/[^']+)'/);
        if (placeholderMatch) {
          this.src = placeholderMatch[1];
          return;
        }
      }
      
      // Default placeholder if nothing else works
      this.src = `https://via.placeholder.com/400x225?text=Image+Not+Found`;
    }
  });
}

// Run the image update when the document is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  updateAllImagesForMultipleFormats();
}); 