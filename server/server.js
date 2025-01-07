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
        (this, _socket, ...data) => {
            let initData = data[0]

            console.log("wtf", this)
            console.log(...data)

            let player = this.players[_socket.id]

            player.name = initData.name
            player.grid = initData.grid
            player.currentPiece = initData.currentPiece
            player.nextPieces = initData.nextPieces

            this.players[_socket.id] = player

            this.updatePlayers(_socket.id, player)
        }
    ],
    "UPDATE_GRID": [
        (_socket, ...data) => {
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

    updatePlayers(updatingPlayerID, player) {
        Object.entries(this.players).forEach((player)=>{
            let playerID = player[0]
            let playerData = player[1]

            if (updatingPlayerID == id) return

            let toSend = player
            toSend.socket = undefined

            this.io.emit("PLAYER_UPDATE", toSend)
        })
    }
}