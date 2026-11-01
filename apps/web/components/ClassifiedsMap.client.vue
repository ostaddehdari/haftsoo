<script setup lang="ts">
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from "maplibre-gl";
import type { ListingPost } from "~/composables/useListingData";
import type { MapCameraPayload } from "~/composables/useMapSearch";

const props = defineProps<{
  posts: ListingPost[];
  city: string;
  selectedPostId?: string;
  neighborhoodKeys?: string[];
  serverClusters?: Array<{ id: string; longitude: number; latitude: number; count: number; destinationZoom: number }>;
}>();
const emit = defineEmits<{
  select: [post: ListingPost | undefined];
  viewport: [camera: MapCameraPayload];
}>();
const config = useRuntimeConfig();
const container = ref<HTMLElement | null>(null);
let map: MapLibreMap | undefined;

const cityCenters: Record<string, [number, number]> = {
  isfahan: [51.6679, 32.6546], tehran: [51.3890, 35.6892], mashhad: [59.6062, 36.2972], shiraz: [52.5837, 29.5918]
};

function postGeoJson(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: props.posts.flatMap((post) => post.latitude === undefined || post.longitude === undefined ? [] : [{
      type: "Feature" as const,
      id: post.listingId,
      geometry: { type: "Point" as const, coordinates: [post.longitude, post.latitude] },
      properties: { listingId: post.listingId, title: post.title, price: post.priceLabel }
    }])
  };
}

function serverClusterGeoJson(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return { type: "FeatureCollection", features: (props.serverClusters ?? []).map((cluster) => ({
    type: "Feature", id: cluster.id, geometry: { type: "Point", coordinates: [cluster.longitude, cluster.latitude] },
    properties: { count: cluster.count, destinationZoom: cluster.destinationZoom }
  })) };
}

function publishCamera() {
  if (!map) return;
  const bounds = map.getBounds();
  const center = map.getCenter();
  emit("viewport", {
    bbox: { minLongitude: bounds.getWest(), minLatitude: bounds.getSouth(), maxLongitude: bounds.getEast(), maxLatitude: bounds.getNorth() },
    zoom: map.getZoom(), center: { longitude: center.lng, latitude: center.lat }
  });
}

async function loadNeighborhoods() {
  if (!map) return;
  const features: GeoJSON.Feature[] = [];
  for (const key of props.neighborhoodKeys ?? []) {
    try {
      const response = await $fetch<{ data: GeoJSON.Feature }>(`${config.public.apiBase}/geo/places/${encodeURIComponent(key)}/boundary?precision=simplified`);
      if (response.data?.geometry) features.push(response.data);
    } catch { /* Missing boundary must not make the map unusable. */ }
  }
  (map.getSource("neighborhoods") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
}

function syncSelectedState(nextId?: string, previousId?: string) {
  if (!map?.getSource("posts")) return;
  if (previousId) map.setFeatureState({ source: "posts", id: previousId }, { selected: false });
  if (nextId) map.setFeatureState({ source: "posts", id: nextId }, { selected: true });
}

function syncServerClusters() {
  if (!map?.getSource("server-clusters")) return;
  (map.getSource("server-clusters") as GeoJSONSource).setData(serverClusterGeoJson());
  const visibility = props.serverClusters?.length ? "none" : "visible";
  map.setLayoutProperty("post-clusters", "visibility", visibility);
  map.setLayoutProperty("post-cluster-count", "visibility", visibility);
}

onMounted(() => {
  map = new maplibregl.Map({
    container: container.value!, style: config.public.mapStyleUrl, center: cityCenters[props.city] ?? cityCenters.isfahan, zoom: 11.2,
    attributionControl: false
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
  map.on("load", () => {
    map!.addSource("posts", { type: "geojson", data: postGeoJson(), cluster: true, clusterRadius: 52, clusterMaxZoom: 14, generateId: false });
    map!.addLayer({ id: "post-clusters", type: "circle", source: "posts", filter: ["has", "point_count"], paint: { "circle-color": "#a62626", "circle-radius": ["step", ["get", "point_count"], 20, 20, 26, 100, 34], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    map!.addLayer({ id: "post-cluster-count", type: "symbol", source: "posts", filter: ["has", "point_count"], layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 }, paint: { "text-color": "#fff" } });
    map!.addLayer({ id: "post-markers", type: "circle", source: "posts", filter: ["!", ["has", "point_count"]], paint: { "circle-color": ["case", ["boolean", ["feature-state", "selected"], false], "#18181b", "#d13b3b"], "circle-radius": ["case", ["boolean", ["feature-state", "selected"], false], 10, 7], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    map!.addSource("server-clusters", { type: "geojson", data: serverClusterGeoJson() });
    map!.addLayer({ id: "server-clusters", type: "circle", source: "server-clusters", paint: { "circle-color": "#a62626", "circle-radius": ["step", ["get", "count"], 19, 20, 25, 100, 33], "circle-stroke-color": "#fff", "circle-stroke-width": 2 } });
    map!.addLayer({ id: "server-cluster-count", type: "symbol", source: "server-clusters", layout: { "text-field": ["get", "count"], "text-size": 12 }, paint: { "text-color": "#fff" } });
    map!.addSource("neighborhoods", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map!.addLayer({ id: "neighborhood-fill", type: "fill", source: "neighborhoods", paint: { "fill-color": "#d13b3b", "fill-opacity": 0.09 } });
    map!.addLayer({ id: "neighborhood-outline", type: "line", source: "neighborhoods", paint: { "line-color": "#d13b3b", "line-width": 2 } });
    syncServerClusters();
    map!.on("click", "post-clusters", async (event) => {
      const feature = map!.queryRenderedFeatures(event.point, { layers: ["post-clusters"] })[0];
      const clusterId = feature?.properties?.cluster_id;
      const coordinates = (feature?.geometry as GeoJSON.Point | undefined)?.coordinates;
      if (clusterId === undefined || !coordinates) return;
      const zoom = await (map!.getSource("posts") as GeoJSONSource).getClusterExpansionZoom(clusterId);
      map!.easeTo({ center: coordinates as [number, number], zoom, duration: 360 });
    });
    map!.on("click", "post-markers", (event) => {
      const id = String(event.features?.[0]?.properties?.listingId ?? "");
      emit("select", props.posts.find((post) => post.listingId === id));
    });
    map!.on("click", "server-clusters", (event) => {
      const feature = event.features?.[0];
      const coordinates = (feature?.geometry as GeoJSON.Point | undefined)?.coordinates;
      if (coordinates) map!.easeTo({ center: coordinates as [number, number], zoom: Number(feature?.properties?.destinationZoom ?? map!.getZoom() + 2), duration: 360 });
    });
    for (const layer of ["post-clusters", "post-markers", "server-clusters"]) {
      map!.on("mouseenter", layer, () => { map!.getCanvas().style.cursor = "pointer"; });
      map!.on("mouseleave", layer, () => { map!.getCanvas().style.cursor = ""; });
    }
    void loadNeighborhoods();
    syncSelectedState(props.selectedPostId);
    publishCamera();
  });
  map.on("moveend", publishCamera);
});

watch(() => props.posts, () => (map?.getSource("posts") as GeoJSONSource | undefined)?.setData(postGeoJson()), { deep: true });
watch(() => props.serverClusters, syncServerClusters, { deep: true });
watch(() => props.selectedPostId, (next: string | undefined, previous: string | undefined) => syncSelectedState(next, previous));
watch(() => props.neighborhoodKeys, () => { void loadNeighborhoods(); }, { deep: true });
onBeforeUnmount(() => map?.remove());
</script>

<template><div ref="container" class="classifieds-map" role="application" aria-label="نقشه آگهی‌ها"></div></template>
