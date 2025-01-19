<script lang="ts">
    import type { GameModes, TetrisClient } from "$lib/client/client";
    import { GAMEMODES } from "$lib/client/client";
    import { createEventDispatcher } from "svelte";

    export let client: TetrisClient | undefined
    export let show: boolean

    let roomName: HTMLInputElement
    let maxPlayers: HTMLInputElement
    let gamemodeSelector: HTMLSelectElement

    let dispatch = createEventDispatcher()

    function validate(): (boolean|string)[] {
        let name = roomName.value
        let maxplrs = parseInt(maxPlayers.value)
        let gamemode = gamemodeSelector.value

        if ((name.trim().length > 20) || name.length < 4) return [false, "Name is too long/short"]
        if (maxplrs > 8 || maxplrs < 1) return [false, "Max Players is too big/small"]
        
        return [true]
    }

    function check(): boolean {
        let validitiy = validate()[0] as boolean
        
        // TODO display errors

        return validitiy
    }

    function CreateRoom() {

        if (!check()) return
        if (!client) return

        let name = roomName.value
        let maxplrs = parseInt(maxPlayers.value)
        let gamemode = gamemodeSelector.value as GameModes

        client.createRoom(gamemode, name, maxplrs)

        dispatch("roomCreated")

        show = false
    }

</script>

<div class:show class="w-full h-full bg-black z-20 bg-opacity-60 absolute top-0 left-0 pointer-events-none hidden justify-center items-center">
    <div class="text-white relative w-[70%] h-[80%] border bg-[rgb(51_51_51)]">
        <div class=" flex flex-col items-center justify-start w-full h-[90%] pt-12">
            <h3 class="pixel text-2xl">Create A Room</h3>

            <div class="flex flex-col mt-2 space-y-2">
                <div class="flex">
                    <p class="pixel text-xs translate-y-1">Room Name:</p>
                    <input bind:this={roomName} class="name ml-2 border border-black !outline-none text-black pixel pl-2" maxlength="20" type="text">
                </div>
        
                <div class="flex mb">
                    <p class="pixel text-xs translate-y-1">Max Players (8 max):</p>
                    <input bind:this={maxPlayers} class="name ml-2 border border-black !outline-none text-black pixel pl-2" min="1" max="8" type="number">
                </div>
        
                <div class="flex">
                    <p class='pixel text-xs'>
                        Gamemode:
                    </p>
                    <select bind:this={gamemodeSelector} name="gamemode" class="text-black pixel text-xs !outline-none pl-1" id="">
                        {#each GAMEMODES as gamemode}
                            <option class="text-black pixel text-sm" value={gamemode}>{gamemode}</option>
                        {/each}
                    </select>
                </div>
            </div>
        </div>
        <div class="flex items-center justify-center w-full h-[10%] border-t">
            <button on:click={CreateRoom} class="px-2 py-1 border pixel text-sm transition-all duration-500 ease-in-out hover:scale-105 active:scale-95">Create Room</button>
        </div>

        <div class="absolute w-full h-full pt-2 pr-2 top-0  left-0 flex items-start justify-end pointer-events-none">
            <button on:click={()=>{show=false}} class="pointer-events-auto transition-all duration-500 ease-in-out hover:scale-105 active:scale-95">
                <p class="pixel ">
                    X
                </p>
            </button>
        </div>
    </div>
</div>

<style lang="postcss">
    .show {
        @apply flex pointer-events-auto;
    }
</style>