import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { TetrisServer } from "./server"

import { handler } from '../build/handler.js'

const port = 3000
const app = express()
const server = createServer(app)

const io = new Server(server)

const serv = new TetrisServer(io)

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server
app.use(handler)

server.listen(port)
