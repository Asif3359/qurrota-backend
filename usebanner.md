# Banner API - Frontend Implementation Guide

## Overview
The Banner API allows you to display time-based banners on your frontend. Each banner contains **one image** with a title and description. The API returns **3-4 banners** to display. If no active banners exist within the current date range, default banners are automatically returned.

## Base URL
```
http://localhost:3000/api/banners
```
(Replace with your production URL in production)

---

## Public Endpoints

### Get Active Banners
**Endpoint:** `GET /api/banners/active`

**Description:** Returns 3-4 active banners (within date range) or default banners if none exist. Each banner has one image, title, and description.

**No Authentication Required**

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "banner_id_1",
      "title": "Summer Sale",
      "description": "Special offers on summer collection",
      "image": {
        "url": "https://cloudinary.com/image1.jpg",
        "alt": "Summer sale banner",
        "publicId": "qurrota/banners/abc123"
      },
      "order": 0,
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T23:59:59.000Z",
      "isDefault": false,
      "isActive": true,
      "link": "https://example.com/sale",
      "target": "_blank",
      "createdAt": "2024-05-15T10:30:00.000Z",
      "updatedAt": "2024-05-15T10:30:00.000Z"
    },
    {
      "_id": "banner_id_2",
      "title": "New Arrivals",
      "description": "Check out our latest products",
      "image": {
        "url": "https://cloudinary.com/image2.jpg",
        "alt": "New arrivals banner",
        "publicId": "qurrota/banners/def456"
      },
      "order": 1,
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T23:59:59.000Z",
      "isDefault": false,
      "isActive": true,
      "link": "https://example.com/new",
      "target": "_blank",
      "createdAt": "2024-05-15T10:30:00.000Z",
      "updatedAt": "2024-05-15T10:30:00.000Z"
    },
    {
      "_id": "banner_id_3",
      "title": "Free Shipping",
      "description": "Free shipping on orders over $50",
      "image": {
        "url": "https://cloudinary.com/image3.jpg",
        "alt": "Free shipping banner",
        "publicId": "qurrota/banners/ghi789"
      },
      "order": 2,
      "startDate": "2024-06-01T00:00:00.000Z",
      "endDate": "2024-08-31T23:59:59.000Z",
      "isDefault": false,
      "isActive": true,
      "link": null,
      "target": "_self",
      "createdAt": "2024-05-15T10:30:00.000Z",
      "updatedAt": "2024-05-15T10:30:00.000Z"
    }
  ],
  "count": 3,
  "isDefault": false,
  "message": "3 active banner(s) retrieved successfully"
}
```

**Empty Response (no banners):**
```json
{
  "success": true,
  "message": "No active banners found",
  "data": [],
  "isDefault": false
}
```

---

## Frontend Implementation Examples

### React/Next.js Example

```jsx
import { useState, useEffect } from 'react';

const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/banners/active');
      const data = await response.json();
      
      if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
        setBanners(data.data);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-rotate banners every 5 seconds
  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentBannerIndex((prev) => 
          (prev + 1) % banners.length
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [banners]);

  if (loading) {
    return <div>Loading banners...</div>;
  }

  if (!banners || banners.length === 0) {
    return null; // No banners to display
  }

  const currentBanner = banners[currentBannerIndex];

  return (
    <div className="banner-container">
      {currentBanner.link ? (
        <a 
          href={currentBanner.link} 
          target={currentBanner.target || '_self'}
          rel={currentBanner.target === '_blank' ? 'noopener noreferrer' : undefined}
          className="banner-link"
        >
          <img 
            src={currentBanner.image.url} 
            alt={currentBanner.image.alt || currentBanner.title || 'Banner'} 
            className="banner-image"
          />
          <div className="banner-content">
            <h2 className="banner-title">{currentBanner.title}</h2>
            <p className="banner-description">{currentBanner.description}</p>
          </div>
        </a>
      ) : (
        <div className="banner-wrapper">
          <img 
            src={currentBanner.image.url} 
            alt={currentBanner.image.alt || currentBanner.title || 'Banner'} 
            className="banner-image"
          />
          <div className="banner-content">
            <h2 className="banner-title">{currentBanner.title}</h2>
            <p className="banner-description">{currentBanner.description}</p>
          </div>
        </div>
      )}
      
      {/* Banner indicators */}
      {banners.length > 1 && (
        <div className="banner-indicators">
          {banners.map((_, index) => (
            <button
              key={index}
              className={`indicator ${index === currentBannerIndex ? 'active' : ''}`}
              onClick={() => setCurrentBannerIndex(index)}
              aria-label={`Go to banner ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
```

### Vanilla JavaScript Example

```javascript
// Fetch and display banners
async function loadBanners() {
  try {
    const response = await fetch('http://localhost:3000/api/banners/active');
    const data = await response.json();
    
    if (data.success && data.data && Array.isArray(data.data) && data.data.length > 0) {
      displayBanners(data.data);
    }
  } catch (error) {
    console.error('Error loading banners:', error);
  }
}

function displayBanners(banners) {
  const container = document.getElementById('banner-container');
  if (!container) return;
  
  let currentIndex = 0;
  
  function showBanner(index) {
    const banner = banners[index];
    if (!banner) return;
    
    container.innerHTML = ''; // Clear previous banner
    
    // Create image element
    const img = document.createElement('img');
    img.src = banner.image.url;
    img.alt = banner.image.alt || banner.title || 'Banner';
    img.className = 'banner-image';
    
    // Create content div
    const content = document.createElement('div');
    content.className = 'banner-content';
    const title = document.createElement('h2');
    title.className = 'banner-title';
    title.textContent = banner.title;
    const description = document.createElement('p');
    description.className = 'banner-description';
    description.textContent = banner.description;
    content.appendChild(title);
    content.appendChild(description);
    
    // Wrap in link if provided
    if (banner.link) {
      const link = document.createElement('a');
      link.href = banner.link;
      link.target = banner.target || '_self';
      link.className = 'banner-link';
      link.appendChild(img);
      link.appendChild(content);
      container.appendChild(link);
    } else {
      const wrapper = document.createElement('div');
      wrapper.className = 'banner-wrapper';
      wrapper.appendChild(img);
      wrapper.appendChild(content);
      container.appendChild(wrapper);
    }
    
    // Create indicators if multiple banners
    if (banners.length > 1) {
      const indicators = document.createElement('div');
      indicators.className = 'banner-indicators';
      banners.forEach((_, idx) => {
        const indicator = document.createElement('button');
        indicator.className = `indicator ${idx === index ? 'active' : ''}`;
        indicator.setAttribute('aria-label', `Go to banner ${idx + 1}`);
        indicator.addEventListener('click', () => showBanner(idx));
        indicators.appendChild(indicator);
      });
      container.appendChild(indicators);
    }
  }
  
  // Show first banner
  showBanner(0);
  
  // Auto-rotate if multiple banners
  if (banners.length > 1) {
    setInterval(() => {
      currentIndex = (currentIndex + 1) % banners.length;
      showBanner(currentIndex);
    }, 5000);
  }
}

// Load banners on page load
document.addEventListener('DOMContentLoaded', loadBanners);
```

### HTML Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>Banner Example</title>
  <style>
    .banner-container {
      width: 100%;
      max-width: 1200px;
      margin: 0 auto;
      position: relative;
    }
    .banner-image {
      width: 100%;
      height: auto;
      display: block;
    }
    .banner-indicators {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
    }
    .indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      background: transparent;
      cursor: pointer;
    }
    .indicator.active {
      background: white;
    }
  </style>
</head>
<body>
  <div id="banner-container"></div>
  
  <script>
    // Add the vanilla JavaScript code from above
    async function loadBanner() {
      try {
        const response = await fetch('http://localhost:3000/api/banners/active');
        const data = await response.json();
        
        if (data.success && data.data && data.data.images) {
          displayBanner(data.data);
        }
      } catch (error) {
        console.error('Error loading banner:', error);
      }
    }
    
    function displayBanner(banner) {
      const container = document.getElementById('banner-container');
      if (!container) return;
      
      let currentIndex = 0;
      
      const img = document.createElement('img');
      img.src = banner.images[currentIndex].url;
      img.alt = banner.images[currentIndex].alt || banner.title || 'Banner';
      img.className = 'banner-image';
      
      if (banner.link) {
        const link = document.createElement('a');
        link.href = banner.link;
        link.target = banner.target || '_self';
        link.appendChild(img);
        container.appendChild(link);
      } else {
        container.appendChild(img);
      }
      
      if (banner.images.length > 1) {
        setInterval(() => {
          currentIndex = (currentIndex + 1) % banner.images.length;
          img.src = banner.images[currentIndex].url;
          img.alt = banner.images[currentIndex].alt || banner.title || 'Banner';
        }, 5000);
      }
    }
    
    document.addEventListener('DOMContentLoaded', loadBanner);
  </script>
</body>
</html>
```

---

## Admin Endpoints (Authentication Required)

### Get All Banners
**Endpoint:** `GET /api/banners?page=1&limit=20&isDefault=false&isActive=true`

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `isDefault` (optional): Filter by default status (true/false)
- `isActive` (optional): Filter by active status (true/false)

### Get Banner by ID
**Endpoint:** `GET /api/banners/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

### Create Banner
**Endpoint:** `POST /api/banners`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `title` (required): Banner title
- `description` (required): Banner description
- `image` (required): Single image file
- `order` (optional): Display order (0, 1, 2, 3)
- `startDate` (required if not default): ISO date string
- `endDate` (required if not default): ISO date string
- `isDefault` (optional): true/false (default: false)
- `isActive` (optional): true/false (default: true)
- `link` (optional): Clickable link URL
- `target` (optional): Link target (_self or _blank)

**Example (JavaScript FormData):**
```javascript
const formData = new FormData();
formData.append('title', 'Summer Sale');
formData.append('description', 'Special offers on summer collection');
formData.append('image', imageFile); // Single image file
formData.append('order', '0');
formData.append('startDate', '2024-06-01T00:00:00Z');
formData.append('endDate', '2024-08-31T23:59:59Z');
formData.append('isDefault', 'false');
formData.append('link', 'https://example.com/sale');
formData.append('target', '_blank');

fetch('http://localhost:3000/api/banners', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`
  },
  body: formData
});
```

### Update Banner
**Endpoint:** `PUT /api/banners/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data
```

**Form Data:** Same as create, all fields optional

### Delete Banner
**Endpoint:** `DELETE /api/banners/:id`

**Headers:**
```
Authorization: Bearer <admin_token>
```

---

## Important Notes

1. **One Image Per Banner:** Each banner has exactly one image with title and description
2. **Multiple Banners:** The API returns 3-4 banners to display (each banner is a separate document)
3. **Default Banners:** Set `isDefault: true` to create banners that show when no time-based banners are active
4. **Time Range:** Banners with `startDate` and `endDate` are only shown when current date is within that range
5. **Auto Fallback:** The API automatically returns default banners if no active time-based banners exist
6. **Display Order:** Banners are ordered by the `order` field (0, 1, 2, 3)
7. **CORS:** Make sure your frontend URL is whitelisted in the backend CORS configuration

---

## Error Handling

```javascript
try {
  const response = await fetch('http://localhost:3000/api/banners/active');
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch banner');
  }
  
  if (data.success && data.data) {
    // Display banner
  } else {
    // No banner available
  }
} catch (error) {
  console.error('Banner error:', error);
  // Handle error (show fallback, retry, etc.)
}
```

---

## Best Practices

1. **Caching:** Cache banner data for a few minutes to reduce API calls
2. **Loading States:** Show a loading skeleton while fetching
3. **Error Fallback:** Display a default image or hide banner on error
4. **Image Optimization:** Use responsive images and lazy loading
5. **Accessibility:** Always include alt text for images
6. **Performance:** Preload banner images for smoother transitions

---

## Quick Start Checklist

- [ ] Update API base URL to production endpoint
- [ ] Add banner container to your layout/component
- [ ] Implement fetch logic for `/api/banners/active`
- [ ] Display images with rotation/carousel
- [ ] Handle empty state (no banners)
- [ ] Add error handling
- [ ] Test with default banners
- [ ] Test with time-based banners
- [ ] Add loading states
- [ ] Optimize images for performance
