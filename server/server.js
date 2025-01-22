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

            if (!toSend.grid) {
                console.warn("player doesn't have grid!!!!")
            }

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
                instance.deleteRoom(gamemode, id)
            }

            socket.leave(`room-${id}`)
            socket.join(`browsing`)

            instance.updateBrowsingPlayers()

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
                    instance.deleteRoom(gamemode, id)
                }

                let toSend = Object.assign({}, leavingPlayer)
                delete toSend.socket
                toSend.id = socket.id
    
                instance.updateOtherPlayers(socket.id, "PLAYER_LEAVING", toSend)
    
                socket.leave(`room-${id}`)

                instance.updateBrowsingPlayers()

                delete instance.playerRoomMap[socket.id]
            }

            delete instance.players[socket.id]
        }
    ],
    "JOIN_ROOM": [
        (instance, socket, {gamemode, roomID}) => {
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

            socket.emit("ROOM_JOINED", instance.rooms[gamemode][roomID], gamemode)

            instance.updateBrowsingPlayers()
        } 
    ],
    "REQUEST_CREATE_ROOM": [
        (instance, socket, {gamemode, name, maxPlayers}) => {
    
            let roomIdentifier = instance.createRoom(gamemode, {
                name,
                maxPlayers
            })

            let roomID = roomIdentifier.id

            socket.leave("browsing")
            socket.join(`room-${roomID}`)

            instance.playerRoomMap[socket.id] = {
                id: roomID,
                gamemode
            }

            socket.emit("ROOM_JOINED", instance.rooms[gamemode][roomID], gamemode)

            instance.updateBrowsingPlayers()
        }
    ],
    "PLAYER_DIED": [
        (instance, socket, player, ...data) => {
            if (!instance.playerRoomMap[socket.id]) return

            let playerRoom = instance.playerRoomMap[socket.id]

            if (!instance.roomHandlerMap[playerRoom.gamemode][playerRoom.id]) return
            
            instance.roomHandlerMap[playerRoom.gamemode][playerRoom.id].gameEnded("PLAYER_DIED", player)
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

    /**
     * @type {[gamemode: string]: {[id: string]: RoomIdentifier}}
     */
    roomHandlerMap

    GAMEMODE_HANDLER_MAP

    constructor(io) {
        this.players = {}

        this.io = io

        this.playerRoomMap = {}
        this.rooms = {
            "SURVIVAL": {},
            "DEATHMATCH": {}
        }
        this.roomHandlerMap = {}
        
        this.GAMEMODE_HANDLER_MAP = {
            "SURVIVAL": SurvivalHandler,
            "DEATHMATCH": DeathmatchHandler
        }
        // she var on my let till i const

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

    deleteRoom(gamemode, id) {
        this.roomHandlerMap[gamemode][id].destroy()

        delete this.roomHandlerMap[gamemode][id]
        delete this.rooms[gamemode][id]
        this.updateBrowsingPlayers()
    }

    createRoom(gamemode, roomData) {
        if (!this.rooms[gamemode]) this.rooms[gamemode] = {}

        let roomID = crypto.randomUUID()

        while (this.rooms[gamemode][roomID]) {
            roomID = crypto.randomUUID()
        }

        roomData.id = roomID 
        roomData.currentPlayers = 1

        this.rooms[gamemode][roomID] = roomData

        let handler = new this.GAMEMODE_HANDLER_MAP[gamemode](gamemode, roomID, this)

        if (!this.roomHandlerMap[gamemode]) this.roomHandlerMap[gamemode] = {}

        this.roomHandlerMap[gamemode][roomID] = handler

        return {
            id: roomID,
            gamemode
        }
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
    
    // TODO: add built in event handlers for room events then pass them down from the server

    /**
     * @type {[id: string]: Player}
     */
    players
    
    constructor(gamemode, id, tetrisServer) {
        if (this.constructor == RoomHandler) {  
            throw new Error("Abstract classes can't be instantiated.")
        }

        this.gamemode = gamemode
        this.id = id
        this.server = tetrisServer
    }

    destroy() {
        throw new Error("Destroy not implemented.")
    }

    gameEnded() {
        throw new Error("gameEnded not implemented.")
    }

    playerJoined(player) {
        this.players[player.id] = player
    }

    playerUpdated(player) {
        for (const v of Object.entries(player)) {
            this.players[player.id][v[0]] = v[1]
        }
    }

    updatePlayers(event, data) {
        this.server.io.of("/").to(`room-${this.id}`).emit(event, data)
    }
}

class SurvivalHandler extends RoomHandler {
    timer
    timerId

    constructor(gamemode, id, tetrisServer) {
        super(gamemode, id, tetrisServer)

        this.timer = 0

        let current = this

        this.timerId = setInterval(() => {
            current.timer += 1

            current.updatePlayers("ROOM:TIMER_UPDATE", current.timer)
        }, 1000)
    }

    destroy() {
        clearInterval(this.timerId)
    }

    gameEnded() {
        console.log("Game Ended!")
    }
}

class DeathmatchHandler extends RoomHandler {
    constructor(gamemode, id, tetrisServer) {
        super(gamemode, id, tetrisServer)
    }
}