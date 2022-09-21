const express = require('express')
const app = express()

//Handlebars import and config
const handlebars = require("express-handlebars")
const hbs = handlebars.create({
    extname: ".hbs",
    defaultLayout: "index.hbs",
    layoutsDir: __dirname + "/views/layout",
    partialsDir: __dirname + "/views/partials/"
})

// Product generator import for test route
const productGenerator = require('./utils/productGenerator')

// Container imports for data persistence in mongoDB
const ProductContainer = require('./utils/mongoDBProductsContainer')
const MessageContainer = require('./utils/mongoDBMessagesContainer')

// Server imports for HTTP and Websocket, as well as standardized socket events
const {Server: SocketServer} = require('socket.io')
const {Server: HTTPServer} = require('http')
const events = require('./socketEvents')

// Session, Cookie Parser and Mongo Store imports
const cookieParser = require('cookie-parser')
const session = require ('express-session')
const MongoStore = require('connect-mongo')

const httpServer = new HTTPServer(app)
const socketServer = new SocketServer(httpServer)

// mongoDB connection
const connectToMongoDB = require('./db/mongoDB')
connectToMongoDB()
    .then(() => console.log('Successfully connected to database.'))
    .catch((err) => console.log(`Could not connect to database. Error: ${err}`))

// Importing mongoose schemas and container instantiation
const Product = require('./db/mongoDB/schemas/product')
const Message = require('./db/mongoDB/schemas/message')
const productContainer = new ProductContainer(Product)
const messageContainer = new MessageContainer(Message)

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.engine("hbs", hbs.engine)

app.use(cookieParser())
app.use(session({
    store: new MongoStore({
        mongoUrl: `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_URI}/${process.env.MONGODB_SESSIONS}`,
        ttl: 60 * 10
    }),
    secret: 'very_secret',
    resave: true,
    saveUninitialized: true
}))

socketServer.on('connection', async (socket) => {
    console.log('A new client has connected')

    let products = await productContainer.getAll()
    socketServer.emit(events.PRODUCTS_INIT, products)

    let normalizedMessages = await messageContainer.getAll()
    socketServer.emit(events.MSGS_INIT, normalizedMessages)

    let testProducts = productGenerator(5)
    socketServer.emit(events.TEST_INIT, testProducts)

    socket.on(events.POST_PRODUCT, async (product) => {
        console.log(product)
        await productContainer.save(product)
        socketServer.sockets.emit(events.NEW_PRODUCT, product)
    })

    socket.on(events.POST_MESSAGE, async (msg) => {
        console.log(msg)
        await messageContainer.save(msg)
        socketServer.sockets.emit(events.NEW_MESSAGE, msg)
    })
})

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html')
})

app.post('/login', (req, res) => {
    req.session.user = req.body.name
    res.redirect('/')
})

app.get('/', (req, res) => {
    req.session.user ? res.render("root.hbs", {user: req.session.user}) : res.redirect('/login')
})

app.post('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/logout')
})

app.get('/logout', (req, res) => {
    res.sendFile(__dirname + '/public/logout.html')
})

app.get('/test-products', (req, res) => {
    res.sendFile(__dirname + '/public/test/test.html')
})

app.use(express.static('public'))

const PORT = 8080
httpServer.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`)
})

httpServer.on('error', error => console.log(`Server error: ${error}`))