
// Mock import.meta.env
const mockEnv = {
  VITE_API_URL: "http://localhost:5000/api/v1"
};

function getAssetUrl(path, apiUrl) {
  if (!path) return "";

  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("blob:") ||
    path.startsWith("data:")
  ) {
    return path;
  }

  if (apiUrl && apiUrl !== "undefined" && apiUrl !== "") {
    try {
      if (apiUrl.startsWith('http')) {
        const url = new URL(apiUrl);
        const origin = url.origin;
        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${origin}${normalizedPath}`;
      }
      
      const normalizedApiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;
      const normalizedPath = path.startsWith("/") ? path : `/${path}`;
      return `${normalizedApiUrl}${normalizedPath}`;
    } catch (e) {
      // 
    }
  }

  return path;
}

console.log("Test 1 (Standard):", getAssetUrl("/uploads/video.mp4", "http://localhost:5000/api/v1"));
console.log("Test 2 (Missing API URL):", getAssetUrl("/uploads/video.mp4", ""));
console.log("Test 3 (String 'undefined'):", getAssetUrl("/uploads/video.mp4", "undefined"));
console.log("Test 4 (Absolute Path):", getAssetUrl("http://example.com/video.mp4", "http://localhost:5000"));
console.log("Test 5 (Path without slash):", getAssetUrl("uploads/video.mp4", "http://localhost:5000/api/v1"));
