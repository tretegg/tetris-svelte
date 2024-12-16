import { sveltekit } from '@sveltejs/kit/vite'
import { type ViteDevServer, defineConfig } from 'vite'
import { TetrisServer } from "../server/server"

import { Server } from 'socket.io'

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return

		const io = new Server(server.httpServer)

		const serv = new TetrisServer(io)
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
})