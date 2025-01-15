// @ts-nocheck

/**
 * @typedef {Object} Piece
 * @property {number} x
 * @property {number} y
 * @property {string} color
 * @property {Shape} shape
 * @property {boolean} grounded
 */

/**
 * @typedef {Object} InitData
 * @prop {string} name
 */

/**
 * @typedef {Object} LeavingData
 * @prop {Player} player
 */

/**
 * @typedef {Object} Player
 * @prop {string} name
 * @prop {number[][]} grid
 * @prop {number} score 
 * @prop {Piece} currentPiece
 * @prop {Piece} nextPieces
 * @prop {any} socket
 */

/**
 * @typedef {Object} Room
 * @prop {string} name
 * @prop {number} maxPlayers
 * @prop {number} currentPlayers
 * @prop {string} id
 */

// {[gamemode:string]: {[id:string]: Room}}

const MAX_NAME_LENGTH = 30

const CLIENT_EVENTS = {
    "CLIENT_INIT": [
        (instance, socket, ...data) => {
            let initData = data[0]

            let player = instance.players[socket.id]

            if (!player.name) player.name = "Player"

            for (const data of Object.entries(initData)) {
                // validate data
                instance.players[socket.id][data[0]] = data[1];
            }

            instance.players[socket.id] = player

            let toSend = Object.assign({}, player)
            delete toSend.socket
            toSend.id = socket.id

            console.log("New Player Joined Game: " + player.name)

            instance.updateOtherPlayers(socket.id, "PLAYER_UPDATE", toSend)
        }
    ],
    "PLAYER_UPDATE": [
        (instance, socket, ...data) => {
            let player = data[0]

            for (const data in Object.entries(player)) {
                // todo: check if data[0] is a valid key
                instance.players[socket.id][data[0]] = data[1]
            }

            let toSend = Object.assign({}, player)
            delete toSend.socket
            toSend.id = socket.id

            instance.updateOtherPlayers(socket.id, "PLAYER_UPDATE", toSend)
        }
    ],
    "LEAVE_ROOM": [
        (instance, socket, ...data) => {
            let leavingPlayer = instance.players[socket.id]

            // if the player's socket has closed before its even sent a init to the server dip outta there
            if (!leavingPlayer) return
    
            console.log(`Player [ID ${socket.id}|${leavingPlayer.name}] is leaving the game.`)

            let toSend = Object.assign({}, leavingPlayer)
            delete toSend.socket
            toSend.id = socket.id

            console.log("Sending Leaving Data:", toSend)

            instance.updateOtherPlayers(socket.id, "PLAYER_LEAVING", toSend)

            delete instance.players[socket.id]
        }
    ],
    "JOIN_ROOM": [
        // room is the id of the room
        (instance, socket, {gamemode, room: roomID}) => {
            let roomData = instance.rooms[gamemode][roomID]

            if (roomData.currentPlayers >= roomData.maxPlayers) {
                socket.emit("GAME_FULL", {gamemode, room: roomID})
                return
            }

            socket.leave("browsing")
            socket.join(`room-${roomID}`)

            roomData.currentPlayers += 1
            instance.rooms[gamemode][roomID] = roomData

            instance.io.to("browsing").emit("ROOMS", instance.rooms)
        } 
    ]
}

const EVENTS = {
    "REQUEST_CREATE_ROOM": [
        (instance, io, ...data) => {

        }
    ]
}

export class TetrisServer {
    /**
     * @type {{id: string}: Player}
     */
    players

    playerRoomMap

    io

    rooms

    constructor(io) {
        this.players = {}

        this.io = io

        this.playerRoomMap = {}
        this.rooms = {}

        let context = this

        Object.entries(EVENTS).forEach((event)=>{
            for (const callback of event[1]) {
                io.on(event[0], (...data)=>{
                    callback(context, io, ...data)
                })
            }
        })

        io.on('connection', (socket) => {

            console.log("Connection Opened.")

            socket.join("browsing")

            socket.emit("ROOMS", this.rooms)

            Object.entries(CLIENT_EVENTS).forEach((event)=>{
                for (const unBindedCallback of event[1]) {
                    socket.on(event[0], (...data)=>{
                        unBindedCallback(context, socket, ...data)
                    })
                }
            })
        })
    }

    updateOtherPlayers(playerID, event, data) {
        let room = this.playerRoomMap[playerID]

        if (!room) {
            console.warn("Room undefined!")
            return
        }
        
        let players = this.io.sockets.clients(room)

        for (const playerSocket in players) {
            if (playerSocket.id == playerID) return

            if (data["socket"]) {
                console.warn(`Socket detected on data while sending [${event}]!`, data)
                delete data["socket"]
            }

            playerSocket.socket.emit(event, data)
        }
    }
}