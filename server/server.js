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

            instance.updatePlayers(_socket.id, player)

            console.log("New Player Joined Game: " + player.name)
        }
    ],
    "UPDATE_GRID": [
        (_instance, _socket, ...data) => {
            let grid = data[0]

            this.players[_socket.id].grid = grid
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

            Object.entries(CLIENT_EVENTS).forEach((event)=>{
                for (const unBindedCallback of event[1]) {
                    socket.on(event[0], (...data)=>{
                        unBindedCallback(context, socket, ...data)
                    })
                }
            })
        })
    }

    updatePlayers(updatingPlayerID, newPlayerData) {
        // let otherPlayers = this.players.filter(player => player.id != updatingPlayerID)

        Object.entries(this.players).forEach((player)=>{
            if (player[0] == updatingPlayerID) return

            let toSend = newPlayerData
            toSend.socket = undefined

            if (!player[1].socket) {
                console.error(`Player [ID ${player[0]}|${player[1].name}] has no socket!`)
                return
            }

            console.log("Distributing Player Update to Player [ID " + player[0] + "|" + player[1].name + "]")
            player[1].socket.emit("PLAYER_UPDATE", toSend)
        })
    }
}