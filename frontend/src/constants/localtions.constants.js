import locationJsonUrl from './india_state_list.json?url';

let cachedTree = null;
let loadPromise = null;

export async function getLocationTree() {
  if (cachedTree) {
    return { success: true, data: cachedTree };
  }

  if (!loadPromise) {
    loadPromise = fetch(locationJsonUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load location data (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        cachedTree = Array.isArray(data) ? data : [];
        return cachedTree;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }

  const data = await loadPromise;
  return { success: true, data };
}
