<script lang="ts">
  import BottomSheet from "$lib/components/BottomSheet.svelte";
  import InterestMenu from "$lib/components/InterestMenu.svelte";
  import ThreeCanvas from "../lib/components/dreiDeCanvas/DreiDeCanvas.svelte";

  let lat = $state(53.55);
  let lng = $state(10.0);
</script>

<ThreeCanvas {lat} {lng} />

<BottomSheet>
  <InterestMenu {lat} {lng} />
</BottomSheet>
