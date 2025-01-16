<script lang="ts">
    import { type keybinds } from "$lib/client/client";

    export let binds: keybinds = {
        left: "a",
        right: "d",
        softDrop: "s",
        rotateClockwise: "ArrowRight",
        rotateCounterClockwise: "ArrowLeft",
        hardDrop: " ",
        hold: "c"
    }
</script>

<div class="space-y-2">
    <p class="pixel text-white text-sm text-center mt-2">
        Keybinds
    </p>
    <div class="flex flex-col space-x-4 items-center justify-center">
        <label class="pixel text-white text-sm" for="left">Left:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.left} type="text" id="left" name="left">
        <label class="pixel text-white text-sm" for="right">Right:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.right} type="text" id="right" name="right">
        <label class="pixel text-white text-sm" for="softDrop">Soft Drop:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.softDrop} type="text" id="softDrop" name="softDrop">
        <label class="pixel text-white text-sm" for="hardDrop">Hard Drop:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.hardDrop} type="text" id="hardDrop" name="hardDrop">
        <label class="pixel text-white text-sm" for="hold">Hold:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.hold} type="text" id="hold" name="hold">
        <label class="pixel text-white text-sm" for="ArrowRight">Rotate Clockwise:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.rotateClockwise} type="text" id="ArrowRight" name="ArrowRight">
        <label class="pixel text-white text-sm" for="ArrowLeft">Rotate Counter Clockwise:</label>
        <input class="bg-black text-white pixel !outline-none px-1 mb-2 border" bind:value={binds.rotateCounterClockwise} type="text" id="ArrowLeft" name="ArrowLeft">
    </div>
</div>