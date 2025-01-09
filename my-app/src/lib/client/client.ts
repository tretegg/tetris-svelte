import { io } from 'socket.io-client'
import type { Socket } from "socket.io-client"

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

type eventHandler = ((socket: Socket, ...data: any | undefined) => void)

const Events: {[eventName in Events]: eventHandler[]} = {
    "DEBUG": [
        (_socket: Socket, ...data: any) => {
            console.log(...data)
        }
    ],
    "CLIENT_INIT": [],
    "PLAYER_UPDATE": [
        
    ]
}

export class TetrisClient {

    private socket: Socket
    connectionEstablish: boolean = false
    eventHooks: {[eventName in Events]: ((...data: any | undefined) => void)[]}
    clientEventHooks: {[eventName in ClientEvents]: ((...data: any | undefined) => void)[]}
    otherPlayers: Player[]

    player: Player

    constructor(name: string, grid: number[][], currentPiece: Piece, nextPiece: Piece) {
        this.socket = io()
        // @ts-ignore
        this.eventHooks = {}
        // @ts-ignore
        this.clientEventHooks = {}
        
        this.otherPlayers = []

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
        Object.entries(Events).forEach((event: [string, unknown])=>{
            for (const callback of event[1] as eventHandler[]) {
                this.socket.on(event[0], (...data: any|undefined)=>{
                    callback.bind(this)(this.socket, ...data)
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
        this.sendEvent("PLAYER_UPDATE", this.player)
    }

    /**
     * Updates the `TetrisClient`'s player grid and syncs it with the server
     */
    updateGrid(grid: Player["grid"]) {
        this.player.grid = grid
        this.sendEvent("PLAYER_UPDATE", {grid} as PlayerUpdateData)
    }

    /**
     * Updates the `TetrisClient`'s player score and syncs it with the server
     */
    updateScore(score: Player["score"]) {
        this.player.score = score
        this.sendEvent("PLAYER_UPDATE", {score} as PlayerUpdateData)
    }
}

