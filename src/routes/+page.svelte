<script lang="ts">
  import BottomSheet from "$lib/components/BottomSheet.svelte";
  import InterestMenu from "$lib/components/InterestMenu.svelte";
  import ThreeCanvas from "../lib/components/dreiDeCanvas/DreiDeCanvas.svelte";

  // Center coordinates of the map
  let mapLat = $state(53.55);
  let mapLng = $state(10.0);

  // Specific coordinates the user clicked on
  let selectedLat = $state(53.55);
  let selectedLng = $state(10.0);

  let mapHeight = $state(5000); // 5km up

  let interestLocs = $state<{ lat: number; lng: number; name: string }[]>([]);

  let bottomSheet: any = $state();
  let interestMenu: any = $state();

  let sheetPercentage = $state(0.05);

  function handleMapClick(lat: number, lng: number) {
    selectedLat = lat;
    selectedLng = lng;

    if (bottomSheet) {
      bottomSheet.open(0.4); // Open shade to 40%
    }

    if (interestMenu) {
      interestMenu.reset(); // Return menu to the main circle selection
    }
  }
</script>

<BottomSheet bind:this={bottomSheet} bind:percentage={sheetPercentage}>
  <InterestMenu
    lat={selectedLat}
    lng={selectedLng}
    heightInMeters={mapHeight}
    {sheetPercentage}
    bind:this={interestMenu}
    onlocationsfetch={(locs) => (interestLocs = locs)}
  />
</BottomSheet>

<ThreeCanvas
  lat={mapLat}
  lng={mapLng}
  heightInMeters={mapHeight}
  onmapclick={handleMapClick}
  {interestLocs}
/>
