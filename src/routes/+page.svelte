<script lang="ts">
  import BottomSheet from "$lib/components/BottomSheet.svelte";
  import InterestMenu from "$lib/components/InterestMenu.svelte";
  import ThreeCanvas from "../lib/components/dreiDeCanvas/DreiDeCanvas.svelte";
</script>

<ThreeCanvas />

<BottomSheet>
  <InterestMenu {lat} {lng} />
</BottomSheet>
