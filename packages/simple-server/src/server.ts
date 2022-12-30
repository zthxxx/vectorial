import http from 'http'
import express from 'express'
import { Server, Socket } from 'socket.io'
import { YSocketIO, Document } from 'y-socket.io/dist/server'
import { logger } from './logger'


const host = process.env.HOST ?? 'localhost'
const port = parseInt(`${process.env.PORT ?? 2234}`)

const app = express()

// Create the http server
const httpServer = http.createServer(app)

// Create an io instance
const io = new Server(httpServer)

// Create the YSocketIO instance
// NOTE: This uses the socket namespaces that match the regular expression /^\/yjs\|.*$/, make sure that when using namespaces
//       for other logic, these do not match the regular expression, this could cause unwanted problems.
// TIP: You can export a new instance from another file to manage as singleton and access documents from all app.
const ySocketIO = new YSocketIO(io, {
  // authenticate: (auth) => auth.token === 'valid-token',
  levelPersistenceDir: './.leveldb-storage',
  // gcEnabled: true,
})

ySocketIO.on('document-loaded', (doc: Document) => logger.info(`The document was loaded (${doc.name})`))
// ySocketIO.on('document-update', (doc: Document, update: Uint8Array) => logger.info(`The document ${doc.name} is updated`))
// ySocketIO.on('awareness-update', (doc: Document, update: Uint8Array) => logger.info(`The awareness of the document ${doc.name} is updated`))
ySocketIO.on('document-destroy', async (doc: Document) => logger.info(`The document is being destroyed (${doc.name} )`))
ySocketIO.on('all-document-connections-closed', async (doc: Document) => logger.info(`All clients disconnected of document ${doc.name}`))

// Execute initialize method
ySocketIO.initialize()

// Handling another socket namespace
io.on('connection', (socket: Socket) => {
  logger.info(`[connection] Connected with user: ${socket.id}`)

  // You can add another socket logic here...
  socket.on('disconnect', () => {
    logger.info(`[disconnect] Disconnected with user: ${socket.id}`)
  })
})

app.all('/heart-beat', function(req, res) {
  logger.info('[heart-beat] ping received from', { ip: req.ip, host: req.hostname })
  res.json({ status: 'ok' })
})

// Http server listen
httpServer.listen(port, host, () => logger.info(`Server running on ${host}:${port}`))

