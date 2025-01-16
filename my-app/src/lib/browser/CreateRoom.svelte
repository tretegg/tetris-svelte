<script lang="ts">
    import type { TetrisClient } from "$lib/client/client";

    export let client: TetrisClient
    export let show: boolean
</script>

<div class:show class="w-full h-full bg-black z-20 bg-opacity-60 absolute top-0 left-0 pointer-events-none hidden justify-center items-center">
    <div class="text-white w-[70%] h-[80%] border bg-[rgb(51_51_51)] flex flex-col items-center justify-start pt-12">
        <h3 class="pixel text-2xl">Create A Room</h3>

        <input type="text">
        <input type="number">
        <select name="gamemode" id="">
            <option value=""></option>
        </select>
    </div>
</div>

<style lang="postcss">
    .show {
        @apply flex pointer-events-auto;
    }
</style>