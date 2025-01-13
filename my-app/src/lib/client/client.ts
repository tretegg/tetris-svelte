import { io } from 'socket.io-client'
import type { Socket } from "socket.io-client"
import _ from "lodash";

export type Events = "DEBUG" | "CLIENT_INIT" | "PLAYER_UPDATE"
export type ClientEvents = "PLAYERS_UPDATE"

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
    nextPieces: Piece,
    currentPiece: Piece 
}

export interface ServerPlayerUpdateData {
    name: string,
    grid: number[][],
    score: number,
    nextPieces: Piece,
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
    nextPieces: Piece
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
        (client: TetrisClient, _socket: Socket, update: ServerPlayerUpdateData, ...data: any) => {
            let playerData = update as Player
            if (!playerData) return

            const id = update.id
            // @ts-ignore
            playerData.id = undefined

            client.otherPlayers[id] = playerData

            console.log("Player Updated", client.otherPlayers)
        }
    ]
}

export class TetrisClient {

    private socket: Socket
    private playerUpdated: boolean = false
    connectionEstablish: boolean = false
    eventHooks: {[eventName in Events]: ((...data: any | undefined) => void)[]}
    clientEventHooks: {[eventName in ClientEvents]: ((...data: any | undefined) => void)[]}
    otherPlayers: {[id: string]: Player}

    player: Player

    constructor(name: string, grid: number[][], currentPiece: Piece, nextPiece: Piece) {
        this.socket = io()
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
            nextPieces: nextPiece
        }

        this.connectToServer()
    }

    /**
     * Handles loading all of handlers for the server.
     */
    private connectToServer() {
        let client = this

        Object.entries(Events).forEach((event: [string, unknown])=>{
            for (const callback of event[1] as eventHandler[]) {
                this.socket.on(event[0], (...data: any|undefined)=>{
                    callback(client, this.socket, ...data)
                })
            }
        })

        this.socket.emit("CLIENT_INIT", this.player as InitData)

        this.connectionEstablish = true
    }

    /** 
     * Sends an event to the server
     */
    sendEvent(eventName: Events, data: any) {
        this.socket.emit(eventName, data)
    }

    /**
     * Hooks an event coming straight from the server
     */
    hookServerEvent(eventName: Events, callback: ((data: any | undefined) => void)) {
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

    private ClientEvent(eventName: ClientEvents, data: any) {
        this.clientEventHooks[eventName].forEach(c => c(data))
    }

    /**
     * Ends the Socket.io connection and annouces it to the server
     */
    endSession() {
        this.socket.emit("LEAVING_GAME", {
            player: this.player
        } as LeavingData)
        this.socket.close()
    }

    /**
     * Update `TetrisClient`'s player data with the server.
     */
    syncWithServer() {
        if (!this.playerUpdated) {
            console.log("[TetrisClient] Player data has not changed since last update")
            
            return
        }

        console.log("[TetrisClient] updating player:", this.player)
        
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

    updateCurrentPiece(piece: Player["currentPiece"]) {
        this.player.currentPiece = piece
        this.playerUpdated = true
    }
}

