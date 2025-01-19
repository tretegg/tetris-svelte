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
    <div class="space-x-4 h-[85%] border-b w-full overflow-auto">
        {#if formattedRoomData}
            <div class="w-[50%] h-full space-y-2 flex flex-col items-center border-r pt-4">
                {#each Object.entries(formattedRoomData) as gamemode}
                    <p class="pixel text-sm text-white">{gamemode[0]}</p>
                    <div class="flex flex-col w-[80%] h-full space-y-4">
                        {#each gamemode[1] as room}
                            <Room {client} {room}/>
                        {/each}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
    <div class="w-full h-[15%] py-4 pl-2">
        <button on:click={()=>{showRoomCreator = true;}} class="w-[20%] h-full border text-white pixel">
            Create Room
        </button>
    </div>

    <CreateRoom on:roomCreated {client} bind:show={showRoomCreator}/>
</div>