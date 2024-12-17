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
 * @typedef {Object} Player
 * @prop {string} name
 * @prop {string} id
 * @prop {number[][]} grid
 * @prop {number} score 
 * @prop {Piece} currentPiece
 * @prop {Piece} nextPiece
 */

const MAX_NAME_LENGTH = 30

const Events = {
    "CLIENT_INIT": [
        (_io, ...data) => {
            let initData = data[0]

            this.players[initData.name]
        }
    ]
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

        Object.entries(Events).forEach((event)=>{
            for (const callback of event[1]) {
                io.on(event[0], (...data)=>{
                    callback.bind(this)(this.io, ...data)
                })
            }
        })

        io.on('connection', (socket) => {
            this.players[socket.id] = {}
        })
    }
}