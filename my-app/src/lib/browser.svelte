<script lang="ts">
    import type { Room as RoomData, Rooms, TetrisClient } from "./client/client";
    import Room from "./browser/Room.svelte";
    import CreateRoom from "./browser/CreateRoom.svelte";

    export let rooms: Rooms
    export let client: TetrisClient | undefined

    let showRoomCreator: boolean = false

    let formattedRoomData: {[gamemode:string]: RoomData[]} | undefined = {}

    function formatRoomsData(roomsData: Rooms) {
        let data: {[gamemode:string]: RoomData[]} = {}

        if (!roomsData) return
        
        for (const gamemode of Object.entries(roomsData)) {
            let rooms = []

            for (const room of Object.entries(gamemode[1])) {
                let roomData = room[1]

                // @ts-ignore
                roomData.gamemode = gamemode[0]

                rooms.push(room[1])
            }

            data[gamemode[0]] = rooms
        }

        return data
    }

    $: formattedRoomData = formatRoomsData(rooms)
</script>

<div class="w-full h-full absolute top-0 left-0 bg-[rgb(51_51_51)] z-10">
    <div class="h-[85%] border-b w-full overflow-auto flex firstBorder">
        {#if formattedRoomData}
            {#each Object.entries(formattedRoomData) as gamemode}
                <div class="w-[50%] h-full space-y-2 flex flex-col items-center  pt-4">
                    <p class="pixel text-sm text-white w-full border-b text-center pb-4">{gamemode[0]}</p>
                    <div class="flex flex-col w-[80%] h-full space-y-4">
                        {#each gamemode[1] as room}
                            <Room {client} {room}/>
                        {/each}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
    <div class="w-full h-[15%] py-4 pl-4 flex items-center">
        <button on:click={()=>{showRoomCreator = true;}} class=" px-8 py-8 transition-all duration-500 ease-in-out hover:scale-105 active:scale-95 border text-white pixel">
            Create Room
        </button>
    </div>

    <CreateRoom on:roomCreated {client} bind:show={showRoomCreator}/>
</div>

<style lang='postcss'>
    .firstBorder > :first-child {
        @apply border-r;
    }
</style>