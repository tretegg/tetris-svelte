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
 * @prop {RoomIdentifier|undefined} room
 */

/**
 * @typedef {Object} RoomIdentifier
 * @prop {string} id
 * @prop {string} gamemode
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

            instance.updatePlayerData(socket.id, initData)

            let player = instance.players[socket.id]

            if (!player.name) player.name = "Player"

            console.log("Client Initialized:", player.name)
        }
    ],
    "PLAYER_UPDATE": [
        (instance, socket, ...data) => {
            if (!instance.playerRoomMap[socket.id]) return
            
            let player = data[0]

            instance.updatePlayerData(socket.id, player)

            let toSend = Object.assign({}, player)
            delete toSend.socket
            toSend.id = socket.id

            instance.updateOtherPlayers(socket.id, "PLAYER_UPDATE", toSend)
        }
    ],
    "LEAVING_ROOM": [
        (instance, socket, player, ...data) => {
            let leavingPlayer = player

            // if the player's socket has closed before its even sent a init to the server dip outta there
            if (!leavingPlayer) return
    
            console.log(`Player [ID ${socket.id}|${leavingPlayer.name}] is leaving a room.`)

            let id = instance.playerRoomMap[socket.id].id
            let gamemode = instance.playerRoomMap[socket.id].gamemode

            let toSend = Object.assign({}, leavingPlayer)
            delete toSend.socket
            toSend.id = socket.id

            instance.updateOtherPlayers(socket.id, "PLAYER_LEAVING", toSend)

            instance.rooms[gamemode][id].currentPlayers -= 1

            if (instance.rooms[gamemode][id].currentPlayers < 1) {
                delete instance.rooms[gamemode][id]
                instance.updateBrowsingPlayers()
            }

            socket.leave(`room-${id}`)
            socket.join(`browsing`)

            delete instance.playerRoomMap[socket.id]
        }
    ],
    "LEAVING_SERVER": [
        (instance, socket, player, ...data) => {
            let leavingPlayer = player

            // if the player's socket has closed before its even sent a init to the server dip outta there
            if (!leavingPlayer) return
    
            console.log(`Player [ID ${socket.id}|${leavingPlayer.name}] is leaving the server.`)

            if (instance.playerRoomMap[socket.id]) {
                let id = instance.playerRoomMap[socket.id].id
                let gamemode = instance.playerRoomMap[socket.id].gamemode

                instance.rooms[gamemode][id].currentPlayers -= 1

                if (instance.rooms[gamemode][id].currentPlayers < 1) {
                    delete instance.rooms[gamemode][id]
                    instance.updateBrowsingPlayers()
                }

                let toSend = Object.assign({}, leavingPlayer)
                delete toSend.socket
                toSend.id = socket.id
    
                instance.updateOtherPlayers(socket.id, "PLAYER_LEAVING", toSend)
    
                socket.leave(`room-${id}`)

                delete instance.playerRoomMap[socket.id]
            }

            delete instance.players[socket.id]
        }
    ],
    "JOIN_ROOM": [
        (instance, socket, {gamemode, roomID}) => {
            console.log("joining with", gamemode, roomID)

            let roomData = instance.rooms[gamemode][roomID]

            if (roomData.currentPlayers >= roomData.maxPlayers) {
                socket.emit("GAME_FULL", {gamemode, roomID})
                return
            }

            socket.leave("browsing")
            socket.join(`room-${roomID}`)

            roomData.currentPlayers += 1
            instance.rooms[gamemode][roomID] = roomData
            instance.playerRoomMap[socket.id] = {
                id: roomID,
                gamemode
            }

            socket.emit("ROOM_JOINED", instance.rooms[gamemode][roomID])

            instance.updateBrowsingPlayers()
        } 
    ],
    "REQUEST_CREATE_ROOM": [
        (instance, socket, {gamemode, name, maxPlayers}) => {
            let roomID = crypto.randomUUID()

            console.log("Creating room with:", gamemode, name, maxPlayers)

            if (!instance.rooms[gamemode]) instance.rooms[gamemode] = {}

            while (instance.rooms[gamemode][roomID]) {
                roomID = crypto.randomUUID()
            }

            instance.rooms[gamemode][roomID] = {
                name,
                maxPlayers,
                currentPlayers: 1,
                id: roomID
            }

            instance.playerRoomMap[socket.id] = {
                id: roomID,
                gamemode
            }

            socket.leave("browsing")
            socket.join(`room-${roomID}`)

            socket.emit("ROOM_JOINED", instance.rooms[gamemode][roomID])

            instance.updateBrowsingPlayers()
        }
    ]
}

const EVENTS = {
}

export class TetrisServer {
    /**
     * @type {[id: string]: Player}
     */
    players

    /**
     * @type {[id: string]: RoomIdentifier}
     */
    playerRoomMap

    io

    rooms

    roomHandlerMap

    constructor(io) {
        this.players = {}

        this.io = io

        this.playerRoomMap = {}
        this.rooms = {
            "SURVIVAL": {},
            "DEATHMATCH": {}
        }
        this.roomHandlerMap = {}

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

            this.players[socket.id] = {

            }

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

    updateBrowsingPlayers() {
        this.io.to("browsing").emit("ROOMS", this.rooms)
    }

    updatePlayerData(id, playerData) {
        for (const data of Object.entries(playerData)) {
            // todo: check if data[0] is a valid key
            this.players[id][data[0]] = data[1]
        }
    }

    updateOtherPlayers(playerID, event, data) {
        let room = this.playerRoomMap[playerID]

        if (!room) return

        room = room.id

        if (!room) {
            console.warn("Room undefined!")
            return
        }

        let players = Array.from(this.io.sockets.adapter.rooms.get(`room-${room}`))

        for (const player of players) {
            if (player == playerID) continue

            // console.log(`Distributing Update [${event}] to Player [ID ${playerID}|${this.players[playerID].name}]`)

            if (data["socket"]) {
                console.warn(`Socket detected on data while sending [${event}]!`, data)
                delete data["socket"]
            }

            this.io.of("/").sockets.get(player).emit(event, data)
        }
    }
}

class RoomHandler {
    gamemode
    id
    server
    
    constructor(gamemode, id, tetrisServer) {
        if (this.constructor == RoomHandler) {  
            throw new Error("Abstract classes can't be instantiated.")
        }
    }
}

class SurvivalHandler extends RoomHandler {
    constructor(gamemode, id) {
        super(gamemode, id)
    }
}