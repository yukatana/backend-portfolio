const { logger } = require('../../logs')

// SocketServer and events import
const {Server: SocketServer} = require("socket.io")
const events = require("./socketEvents")

// Factory import and DAO fetching
const factory = require('../factories/DAOFactory')
const ProductDAO = factory.getProductDAO()
const MessageDAO = factory.getMessageDAO()

// DTO import
const ProductDTO = require('../DTOs/productDTO')

// Repository import for data processing
const MessageRepository = require('../repositories/messageRepository')

module.exports = socketListener = (httpServer) => {
    const socketServer = new SocketServer(httpServer)

    socketServer.on('connection',  async (socket) => {
        logger.info('A new client has connected')

        let products = await ProductDAO.getAll()
        let _products = ProductDTO.getAllToClient(products)
        socketServer.emit(events.PRODUCTS_INIT, _products)

        let normalizedMessages = await MessageDAO.getAll()
        let processedNormalizedMessages = MessageRepository.processAllMessages(normalizedMessages)
        socketServer.emit(events.MSGS_INIT, processedNormalizedMessages)

        socket.on(events.POST_PRODUCT, async (product) => {
            logger.info(product)
            await ProductDAO.save(product)
            let _product = new ProductDTO(product).toClient()
            socketServer.sockets.emit(events.NEW_PRODUCT, _product)
        })

        socket.on(events.POST_MESSAGE, async (msg) => {
            logger.info(msg)
            await MessageDAO.save(msg)
            socketServer.sockets.emit(events.NEW_MESSAGE, msg)
        })
    })
}