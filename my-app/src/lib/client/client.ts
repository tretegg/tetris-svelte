import { io } from 'socket.io-client'
import type { Socket } from "socket.io-client"
import _ from "lodash";

export type Events = "DEBUG" | "CLIENT_INIT" | "PLAYER_UPDATE" | "PLAYER_LEAVING" | "ROOMS" | "ROOM_JOINED" | "PLAYER_LEAVING"
export type ServerRoomEvents = "ROOM:TIMER_UPDATE" 

export type RoomEvents = "ROOM:TIMER_UPDATE"
export type SocketEvents = "PLAYER_UPDATE" | "ROOMS" | "ROOM_JOINED" | "LEAVING_ROOM" 
export type ClientEvents = RoomEvents | SocketEvents

export type Shape = number[][];

export type nextPieces = {
    shape: Shape;
    color: string;
    pieceID: number;
}

export type keybinds = {
    left: string;
    right: string;
    softDrop: string;
    hardDrop: string;
    rotateClockwise: string;
    rotateCounterClockwise: string;
    hold: string;
}

export type heldPiece = {
    shape: Shape;
    color: string;
    pieceID: number;
}

export interface Piece {
    x: number,
    y: number,
    color: string
    shape: Shape
    grounded: boolean
    pieceID: number
    isGhost: boolean
}

export interface RoomIdentifier {
    id: string,
    gamemode: string
}

export interface Room {
    name: string;
    maxPlayers: number;
    currentPlayers: number;
    id: string;
}

export interface Player {
    name?: string
    grid?: number[][]
    score?: number,
    nextPieces?: nextPieces[],
    currentPiece?: Piece, 
}

export interface ServerPlayerUpdateData {
    name: string,
    grid: number[][],
    score: number,
    nextPieces: nextPieces[],
    currentPiece: Piece,
    id: string
}

export interface PlayerUpdateData {
    name?: string,
    grid?: number[][],
    score?: number,
    nextPieces?: Piece,
    currentPiece?: Piece
}

export interface InitData {
    name: string,
    grid: number[][],
    currentPiece: Piece,
    nextPieces: nextPieces[]
}

export interface LeavingData {
    player: Player
}

export type Rooms = {[gamemode: string]: {[id:string]: Room}}

export type eventHandler = ((client: TetrisClient, socket: Socket, ...data: any | undefined) => void)

export type GameModes = "SURVIVAL" | "DEATHMATCH"
export const GAMEMODES: GameModes[] = ["SURVIVAL", "DEATHMATCH"]

class ClientRoomHandler {
    gamemode: string
    id: string
    client: TetrisClient
    
    players: {[id: string]: Player}
    
    constructor(gamemode: string, id: string, client: TetrisClient) {
        if (this.constructor == ClientRoomHandler) {  
            throw new Error("Abstract classes can't be instantiated.")
        }

        this.players = client.otherPlayers

        client.hookClientEvent("PLAYER_UPDATE", (p: {[id:string]: Player}) => {
            if (!this) return
            
            this.players = p
        })

        this.gamemode = gamemode
        this.id = id
        this.client = client
    }

    sync() {
        throw new Error("Function Not Implemented!")
    }

    event(eventName: RoomEvents, data: any) {
        this.client._passUpEvent(eventName, data)
    }
}

class SurvivalHandler extends ClientRoomHandler {
    // TODO: timer is synced
    
    constructor(gamemode: string, id: string, client: TetrisClient) {
        super(gamemode, id, client)

        client._roomHookServerEvent("ROOM:TIMER_UPDATE", (data: any) => {
            console.log("TIMER_UPDATE:", data)

            this.event("ROOM:TIMER_UPDATE", data)
        })
    }
}

class DeathmatchHandler extends ClientRoomHandler {
    // TODO: send lines

    constructor(gamemode: string, id: string, client: TetrisClient) {
        super(gamemode, id, client)
    }
}

const GAMEMODE_MAP: {[id in GameModes]: typeof ClientRoomHandler} = {
    "SURVIVAL": SurvivalHandler,
    "DEATHMATCH": DeathmatchHandler
}

const Events: {[eventName in Events]: eventHandler[]} = {
    "DEBUG": [
        (_client: TetrisClient, _socket: Socket, ...data: any) => {
            console.log(...data)
        }
    ],
    "CLIENT_INIT": [(client, _socket, players: {[id: string]: Player})=>{
        client.otherPlayers = players
        console.log("INIT:", client.otherPlayers)
    }],
    "PLAYER_UPDATE": [
        (client: TetrisClient, _socket: Socket, update: ServerPlayerUpdateData, ..._data: any) => {
            let playerData = Object.assign({}, update) as Player

            if (!playerData) return

            const id = update.id
            // @ts-ignore
            delete playerData.id

            client.otherPlayers[id] = playerData

            console.log(`Player ${playerData.name} Updated. Score:`, playerData.score)

            client.ClientEvent("PLAYER_UPDATE", client.otherPlayers)
        }
    ],
    "PLAYER_LEAVING": [
        (client, _socket, player) => {
            console.log(`Player [ID ${player.id}|${player.name}] left the game.`)

            delete client.otherPlayers[player.id]
            
            client.ClientEvent("PLAYER_UPDATE", client.otherPlayers)
        }
    ],
    "ROOMS": [
        (client, _socket, rooms: Rooms) => {
            console.log("ROOMS:", rooms)

            client.rooms = rooms
            client.ClientEvent("ROOMS", rooms)
        }
    ],
    "ROOM_JOINED": [
        (client, _socket, room: Room, gamemode: GameModes) => {
            console.log(`Room ${room.name} Joined!`)

            if (!GAMEMODE_MAP[gamemode]) {
                console.error("Invalid gamemode:", gamemode)
                return
            }

            client.currentRoom = new GAMEMODE_MAP[gamemode](gamemode, room.id, client)
            client.playerState = PLAYER_STATE.PLAYING

            // @ts-ignore
            let sendingRoom: Room & {gamemode: GameModes} = room
            sendingRoom.gamemode = gamemode

            client.ClientEvent("ROOM_JOINED", room)
        }
    ],
}

enum PLAYER_STATE {
    BROWSING,
    PLAYING,
    MAIN_MENU,
}

export class TetrisClient {

    private socket?: Socket
    private playerUpdated: boolean = false

    connectionEstablished: boolean = false

    eventHooks: {[eventName in Events]: ((...data: any | undefined) => void)[]}
    clientEventHooks: {[eventName in ClientEvents]: ((...data: any | undefined) => void)[]}
    roomEventHooks?:  {[eventName in ServerRoomEvents]: ((...data: any | undefined) => void)[]}

    otherPlayers: {[id: string]: Player}
    playerState: PLAYER_STATE

    rooms?: Rooms

    currentRoom?: ClientRoomHandler

    currentGameMode?: GameModes

    player: Player

    constructor() {
        //, grid: number[][], currentPiece: Piece, nextPieces: nextPieces[]
        
        // @ts-ignore
        this.eventHooks = {}
        // @ts-ignore
        this.clientEventHooks = {}
        
        this.otherPlayers = {}

        this.playerState = PLAYER_STATE.MAIN_MENU

        this.player = {
        }
    }

    /**
     * Handles loading all of handlers for the server.
     */
    connectToServer() {
        let client = this
        this.socket = io(window.location.origin, {query: {name: this.player.name}})

        Object.entries(Events).forEach((event: [string, unknown])=>{
            for (const callback of event[1] as eventHandler[]) {
                this.socket!.on(event[0], (...data: any|undefined)=>{
                    callback(client, this.socket!, ...data)
                })
            }
        })

        this.socket.onAny((event: RoomEvents, ...data) => {
            if (!this.roomEventHooks) return
            if (!this.roomEventHooks[event]) return

            for (const callback of this.roomEventHooks[event]) {
                callback(...data)
            }
        })

        this.socket.emit("CLIENT_INIT", this.player as InitData)

        this.socket.on("disconnect", () => {
            this.endSession()
        })

        this.connectionEstablished = true

        this.playerState = PLAYER_STATE.BROWSING
    }

    /** 
     * Sends an event to the server
     */
    sendEvent(eventName: Events, data: any) {
        if (!this.socket) {
            console.warn(`[TetrisClient] Trying to send event ${eventName} with ${data} without socket!`)
            return
        }

        this.socket.emit(eventName, data)
    }

    /**
     * Hooks an event coming straight from the server
     */
    hookServerEvent(eventName: Events, callback: ((data: any | undefined) => void)) {
        if (!this.socket) {
            console.warn(`Cannot hook server event ${eventName} without socket!`)
            return
        }

        if (!this.eventHooks[eventName]) this.eventHooks[eventName] = []
        
        this.eventHooks[eventName].push(callback)

        this.socket.on(eventName, callback)
    }

    /**
     * Hooks an event that the `TetrisClient` has sent out
     */
    hookClientEvent(eventName: ClientEvents, callback: ((data: any | undefined) => void)) {
        if (!this.clientEventHooks[eventName]) this.clientEventHooks[eventName] = []
        
        this.clientEventHooks[eventName].push(callback)
    }

    ClientEvent(eventName: ClientEvents, data: any) {
        if (!this.clientEventHooks[eventName]) return

        this.clientEventHooks[eventName].forEach(c => c(data))
    }

    /**
     * Ends the Socket.io connection and annouces it to the server
     */
    endSession() {
        console.log("ending session...")

        if (!this.socket) {
            console.warn("Trying to end session that doesn't have socket!!")
            return
        }

        this.socket.emit("LEAVING_SERVER", this.player)

        this.socket.close()

        this.otherPlayers = {}

        delete this.socket

        this.connectionEstablished = false
    }

    leaveGame() {
        if (!this.socket) return
        if (!this.currentRoom) return

        this.socket.emit("LEAVING_ROOM", this.player)

        delete this.currentRoom
        delete this.roomEventHooks

        this.otherPlayers = {}

        this.playerState = PLAYER_STATE.BROWSING

        this.ClientEvent("LEAVING_ROOM", {})
    }

    /**
     * Update `TetrisClient`'s player data with the server.
     */
    syncWithServer() {

        // console.log({
        //     playerUpdated: this.playerUpdated,
        //     connectionEstablished: this.connectionEstablished,
        //     socket: this.socket,
        //     currentRoom: this.currentRoom
        // })

        if (!this.playerUpdated) return
        if (!this.connectionEstablished) return
        if (!this.socket) return
        if (!this.currentRoom) return

        //console.log("Syncing...")

        this.sendEvent("PLAYER_UPDATE", this.player as PlayerUpdateData)
        this.playerUpdated = false
    }

    /**
     * Updates the `TetrisClient`'s player grid
     */
    updateGrid(grid: Player["grid"]) {
        this.player.grid = grid
        this.playerUpdated = true
    }

    /**
     * Updates the `TetrisClient`'s player score
     */
    updateScore(score: Player["score"]) {
        this.player.score = score
        this.playerUpdated = true
    }

    /**
     * Updates the `TetrisClient`'s player current piece
     */
    updateCurrentPiece(piece: Player["currentPiece"]) {
        this.player.currentPiece = piece
        this.playerUpdated = true
    }

    /**
     * Updates the `TetrisClient`'s player next pieces
     */
    updateNextPieces(pieces: Player["nextPieces"]) {
        this.player.nextPieces = pieces
        this.playerUpdated = true
    }

    /** 
     * Updates Player with any data.
     */
    updatePlayer(playerData: any) {
        for (const data of Object.entries(playerData)) {
            // @ts-ignore
            this.player[data[0]] = data[1]
        }
        
        this.playerUpdated = true
    }

    createRoom(gamemode: GameModes, name: string, maxPlayers: number) {
        if (!this.socket) return

        if (!maxPlayers || !name || !gamemode) {
            console.warn("Room creation data is undefined!", gamemode, name, maxPlayers)
            return
        }

        // @ts-ignore
        this.roomEventHooks = {}

        this.socket.emit("REQUEST_CREATE_ROOM", {
            gamemode,
            name,
            maxPlayers
        })
    }

    joinRoom(gamemode: string, id: string) {
        if (!this.socket) return

        // @ts-ignore
        this.roomEventHooks = {}

        this.socket.emit("JOIN_ROOM", {gamemode, roomID: id})
    }

    _passUpEvent(eventName: RoomEvents, data: any) {
        if (!this.clientEventHooks[eventName]) return

        this.clientEventHooks[eventName].forEach(c => c(data))
    }

    _roomHookServerEvent(eventName: ServerRoomEvents, callback: (data: any) => void) {
        if (!this.roomEventHooks) return
        if (!this.roomEventHooks[eventName]) this.roomEventHooks[eventName] = []

        this.roomEventHooks[eventName].push(callback)
    }

    died() {
        if (!this.socket) return

        this.socket.emit("PLAYER_DIED", this.player)
    }
}