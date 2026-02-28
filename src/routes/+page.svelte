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

  let bottomSheet: any = $state();
  let interestMenu: any = $state();

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

<BottomSheet bind:this={bottomSheet}>
  <InterestMenu lat={selectedLat} lng={selectedLng} bind:this={interestMenu} />
</BottomSheet>

<ThreeCanvas lat={mapLat} lng={mapLng} onmapclick={handleMapClick} />
