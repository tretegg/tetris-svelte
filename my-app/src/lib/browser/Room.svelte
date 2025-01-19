<script lang="ts">
    import type { Room, TetrisClient } from "$lib/client/client";

    export let room: Room & {gamemode?: string}
    export let client: TetrisClient | undefined

    function joinRoom() {
        if (!client) return

        client.joinRoom(room.gamemode!, room.id)
    }

    $: console.log("Room:", room)
</script>

<button on:click={joinRoom} class="flex bg-black w-full h-[5rem] border transition-all duration-500 ease-in-out hover:scale-105 active:scale-95">
    <div class="w-[40%] border-r h-full pt-1 pl-1">
        <p class="text-white pixel text-xs text-left">
            {room.name}
        </p>
    </div>

    <div class="w-[60%] h-full flex flex-col">
        <div class='flex pl-2 pt-1'>
            <p class="text-white pixel text-xs">
                Players: {room.currentPlayers}/{room.maxPlayers}
            </p>
        </div>
    </div>
</button>