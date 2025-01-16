<script lang="ts">
    import type { Room as RoomData, Rooms, TetrisClient } from "./client/client";
    import Room from "./browser/Room.svelte";
    import CreateRoom from "./browser/CreateRoom.svelte";

    export let rooms: Rooms
    export let client: TetrisClient

    let showRoomCreator: boolean = false

    let formattedRoomData: {[gamemode:string]: RoomData[]} | undefined = {}

    function formatRoomsData(roomsData: Rooms) {
        let data: {[gamemode:string]: RoomData[]} = {}

        if (!roomsData) return
        
        for (const gamemode of Object.entries(roomsData)) {
            let rooms = []

            for (const room of Object.entries(gamemode[1])) {
                rooms.push(room[1])
            }

            data[gamemode[0]] = rooms
        }

        return data
    }
</script>

<div class="w-full h-full absolute top-0 left-0 bg-[rgb(51_51_51)] z-10">
    <div class="flex items-center justify-center space-x-4">
        {#if formattedRoomData}
            {#each Object.entries(formattedRoomData) as gamemode}
                <div class="h-full border w-34">
                    {#each gamemode[1] as room}
                        <Room {room}/>
                    {/each}
                </div>
            {/each}
        {/if}
    </div>
    <div class="w-full h-24">
        <button on:click={()=>{showRoomCreator = true}} class="w-[20%] h-full border text-white pixel">
            Create Room
        </button>
    </div>

    <CreateRoom {client} show={showRoomCreator}/>
</div>