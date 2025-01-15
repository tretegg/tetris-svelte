<script lang="ts">
    type Modes = "SURVIVAL" | "DEATHMATCH"

    export let gameMode: Modes = "SURVIVAL"
    const GAMEMODES: Modes[] = ["SURVIVAL", "DEATHMATCH"]

    let clazz: string = "", stylez: string = ""
    export {clazz as class, stylez as style}

    function start() {
        
    }

</script>

<div class=" space-y-2 {clazz}" style={stylez}>
    <p class="w-full pixel text-white text-sm text-center">
        Game Modes
    </p>
    <div class="flex space-x-4 items-center justify-center">
        {#each GAMEMODES as mode}
            <button class:current={mode === gameMode} on:click={()=>{gameMode = mode}} class="w-fit bg-black h-12 border px-4 hover:scale-105 active:scale-95 transition-all duration-500 ease-in-out">
                <p class="text-white pixel text-xs">
                    {mode}
                </p>
            </button>
        {/each}
    </div>
</div>

<style lang="postcss">
    .current {
        @apply scale-[1.15];
    }
</style>