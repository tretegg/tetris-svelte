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
        (instance, _socket, ...data) => {
            let initData = data[0]

            let player = instance.players[_socket.id]

            player.name = initData.name
            player.grid = initData.grid
            player.currentPiece = initData.currentPiece
            player.nextPieces = initData.nextPieces

            instance.players[_socket.id] = player

            let toSend = Object.assign({}, player)
            toSend.socket = undefined

            console.log("New Player Joined Game: " + player.name)

            instance.updateOtherPlayers(_socket.id, "PLAYER_UPDATE", toSend)
        }
    ],
    "UPDATE_PLAYER": [
        (instance, socket, ...data) => {
            let player = data[0]

            for (const data in Object.entries(player)) {
                // todo: check if data[0] is a valid key
                instance.players[socket.id][data[0]] = data[1]
            }

            instance.updateOtherPlayers(socket.id, "PLAYER_UPDATE", player)
        }
    ],
    "LEAVING_GAME": [
        (instance, socket, ...data) => {
            let leavingPlayer = instance.players[socket.id]

            console.log(`Player [ID ${socket.id}|${leavingPlayer.name}] is leaving the game.`)

            instance.updateOtherPlayers(socket.id, "PLAYER_LEAVING", leavingPlayer)

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
            this.players[socket.id] = {
                score: 0,
                socket
            }

            console.log("player joined with id:", socket.id)

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

            if (!player[1].socket) {
                console.error(`Player [ID ${player[0]}|${player[1].name}] has no socket!`)
                return
            }

            console.log(`Distributing Update [${event}] to Player [ID  ${player[0]}|${player[1].name}]`)

            if (!data) {
                console.error("Sending data is undefined?")
                continue
            }

            player[1].socket.emit(event, data)
        })
    }
}