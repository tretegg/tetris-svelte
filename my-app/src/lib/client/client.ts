import { io } from 'socket.io-client'
import type { Socket } from "socket.io-client"
import _ from "lodash";

export type Events = "DEBUG" | "CLIENT_INIT" | "PLAYER_UPDATE"
export type ClientEvents = "PLAYER_UPDATE"

export type Shape = number[][];

export type nextPieces = {
    shape: Shape;
    color: string;
    pieceID: number;
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
}

export interface Player {
    name: string
    grid: number[][]
    score: number,
    nextPieces?: nextPieces[],
    currentPiece?: Piece 
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

type eventHandler = ((client: TetrisClient, socket: Socket, ...data: any | undefined) => void)

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
    ]
}

export class TetrisClient {

    private socket?: Socket
    private playerUpdated: boolean = false
    connectionEstablish: boolean = false
    eventHooks: {[eventName in Events]: ((...data: any | undefined) => void)[]}
    clientEventHooks: {[eventName in ClientEvents]: ((...data: any | undefined) => void)[]}
    otherPlayers: {[id: string]: Player}

    player: Player

    constructor(name: string, grid: number[][], currentPiece: Piece, nextPieces: nextPieces[]) {
        // @ts-ignore
        this.eventHooks = {}
        // @ts-ignore
        this.clientEventHooks = {}
        
        this.otherPlayers = {}

        this.player = {
            name,
            grid,
            score: 0,
            currentPiece,
            nextPieces: nextPieces
        }

        this.connectToServer()
    }

    /**
     * Handles loading all of handlers for the server.
     */
    private connectToServer() {
        let client = this
        this.socket = io(window.location.origin, {query: {name: this.player.name}})

        Object.entries(Events).forEach((event: [string, unknown])=>{
            for (const callback of event[1] as eventHandler[]) {
                this.socket!.on(event[0], (...data: any|undefined)=>{
                    callback(client, this.socket!, ...data)
                })
            }
        })

        this.socket.emit("CLIENT_INIT", this.player as InitData)

        this.socket.on("disconnect", () => {
            this.endSession()
        })

        this.connectionEstablish = true
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
        this.clientEventHooks[eventName].forEach(c => c(data))
    }

    /**
     * Ends the Socket.io connection and annouces it to the server
     */
    endSession() {
        if (!this.socket) {
            console.warn("Trying to end session that doesn't have socket!!")
            return
        }

        this.socket.emit("LEAVING_GAME", {
            player: this.player
        } as LeavingData)
        
        this.socket.close()

        delete this.socket

        this.connectionEstablish = false
    }

    /**
     * Update `TetrisClient`'s player data with the server.
     */
    syncWithServer() {
        if (!this.playerUpdated) return
        if (!this.connectionEstablish) return
        if (!this.socket) return

        console.log("Syncing...")

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
}

