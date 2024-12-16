import { io } from 'socket.io-client'
import type { Socket } from "socket.io-client"

export type Events = "DEBUG"

type eventHandler = ((socket: Socket, ...data: any | undefined) => void)

const Events: {[eventName in Events]: eventHandler[]} = {
    "DEBUG": [
        (_socket: Socket, ...data: any) => {
            console.log(...data)
        }
    ]
}


export class TetrisClient {

    private socket: Socket
    connectionEstablish: boolean = false
    eventHooks: {[eventName in Events]: ((...data: any | undefined) => void)[]}

    constructor() {
        this.socket = io()
        // @ts-ignore
        this.eventHooks = {}
        
        this.connectToServer()
    }

    /**
     * Handles loading all of handlers for the server.
     */
    connectToServer() {
        Object.entries(Events).forEach((event: [string, unknown])=>{
            for (const callback of event[1] as eventHandler[]) {
                this.socket.on(event[0], (...data: any|undefined)=>{
                    callback(this.socket, ...data)
                })
            }
        })

        this.connectionEstablish = true
    }

    sendEvent(eventName: Events, data: any) {
        this.socket.emit(eventName, data)
    }

    hookEvent(eventName: Events, callback: ((data: any | undefined) => void)) {
        if (!this.eventHooks[eventName]) this.eventHooks[eventName] = []
        
        this.eventHooks[eventName].push(callback)

        this.socket.on(eventName, callback)
    }
}

