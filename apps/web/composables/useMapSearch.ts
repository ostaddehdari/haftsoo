import type { ListingPost } from "~/composables/useListingData";

export interface MapCameraPayload {
  bbox: { minLongitude: number; minLatitude: number; maxLongitude: number; maxLatitude: number };
  zoom: number;
  center: { longitude: number; latitude: number };
}

export interface MapClusterPayload { id: string; longitude: number; latitude: number; count: number; destinationZoom: number }

export function useMapSearch(category: Ref<string | undefined>, districtIds: Ref<string[]>) {
  const route = useRoute();
  const router = useRouter();
  const config = useRuntimeConfig();
  const selectedPostId = ref<string>();
  const loading = ref(false);
  const error = ref<string>();
  const clusters = ref<MapClusterPayload[]>([]);
  const cameraHash = ref<string>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const mapMode = computed(() => route.query.map === "1");

  function setMapMode(active: boolean) {
    return router.replace({ query: { ...route.query, map: active ? "1" : undefined } });
  }

  function selectPost(post: ListingPost | undefined) { selectedPostId.value = post?.listingId; }

  function updateViewport(camera: MapCameraPayload) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      loading.value = true;
      error.value = undefined;
      try {
        const response = await $fetch<{ data: { clusters: MapClusterPayload[]; cameraHash: string } }>(`${config.public.apiBase}/map/viewport`, {
          method: "POST",
          headers: { "x-tenant-id": config.public.tenantId },
          body: { camera, search: { categorySlug: category.value, districtIds: districtIds.value }, selectedNeighborhoodKeys: districtIds.value, previousCameraHash: cameraHash.value }
        });
        clusters.value = response.data.clusters;
        cameraHash.value = response.data.cameraHash;
      } catch {
        error.value = "نمایش نمونه آفلاین؛ اتصال سرویس نقشه برقرار نیست.";
      } finally {
        loading.value = false;
      }
      void router.replace({ query: { ...route.query, map: "1", map_bbox: Object.values(camera.bbox).map((value) => value.toFixed(5)).join(","), map_zoom: camera.zoom.toFixed(2) } });
    }, 300);
  }

  onScopeDispose(() => { if (timer) clearTimeout(timer); });
  return { mapMode, selectedPostId, loading, error, clusters, setMapMode, selectPost, updateViewport };
}
