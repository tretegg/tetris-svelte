// @ts-nocheck
export class TetrisServer {

    constructor(io) {
        io.on('connection', (socket) => {
            socket.emit("PLAYER_NAME")
        })
    }
}