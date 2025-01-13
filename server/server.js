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
    "LEAVING_GAME": [
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
    ]
}

const EVENTS = {

}

export class TetrisServer {
    /**
     * @type {{id: string}: Player}
     */
    players

    io

    constructor(io) {
        this.players = {}

        this.io = io

        Object.entries(EVENTS).forEach((event)=>{
            for (const callback of event[1]) {
                io.on(event[0], (...data)=>{
                    callback.bind(this)(this.io, ...data)
                })
            }
        })

        let context = this

        io.on('connection', (socket) => {

            console.log("Connection Opened.")

            let otherPlayers = {}

            for (const player of Object.entries(this.players)) {
                let p = Object.assign({}, player[1])

                if (p.socket) delete p.socket

                otherPlayers[player[0]] = p
            }

            socket.emit("CLIENT_INIT", otherPlayers)

            this.players[socket.id] = {
                score: 0,
                socket
            }

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
        Object.entries(this.players).forEach((player)=>{
            if (player[0] == playerID) return

            console.log(`Distributing Update [${event}] to Player [ID  ${player[0]}|${player[1].name}]`)

            if (!player[1].socket) {
                console.error(`Player [ID ${player[0]}|${player[1].name}] has no socket!`)
                return
            }

            if (!data || !event || !playerID) {
                console.error(`Sending invalid data to player [${player[0]}|${player[1].name}] while sending [${event}] from player [${playerID}]:`, data)
                return
            }

            if (!player[1].name) {
                console.error(`Player [${player[0]}] has no name!`)
                return
            }

            if (data["socket"]) {
                console.warn(`Socket detected on data while sending [${event}]!`, data)
                delete data["socket"]
            }

            player[1].socket.emit(event, data)
        })
    }
}