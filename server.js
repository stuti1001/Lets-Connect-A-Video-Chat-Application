//Create our express and socket.io servers
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
    debug: true
});

app.use('/peerjs' , peerServer);
const port = process.env.PORT || 3000
app.set('view engine', 'ejs') // Tell Express we are using EJS
app.use(express.static('public')) // Tell express to pull the client script from the public folder

// If they join the base link, generate a random UUID and send them to a new room with said UUID
app.get('/', (req, res) => {
    res.redirect(`/${uuidV4()}`)
})
// If they join a specific room, then render that room
app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room })
})

let roomBoard = {};
let socketroom = {};

// When someone connects to the server
io.on('connection', socket => {
    // When someone attempts to join the room
    socket.on('join-room', (roomId, userId, userName) => {
        socket.join(roomId)  // Join the room
        socketroom[socket.id] = roomId;
        socket.to(roomId).broadcast.emit('user-connected', userId)
        socket.to(roomId).emit("createMessage", `${userName} joined the room.`, 'Bot'); // Tell everyone else in the room that we joined
        socket.on("message", (message) => {
            io.to(roomId).emit("createMessage", message, userName)
        })
        socket.on('endvidcall', () => {
            socket.to(roomId).emit("End_Call", userId)
        })

        socket.on('draw', (newx, newy, prevx, prevy, color, size) => {
            socket.to(socketroom[socket.id]).emit('draw', newx, newy, prevx, prevy, color, size);
        })

        socket.on('clearBoard', () => {
            socket.to(socketroom[socket.id]).emit('clearBoard');
        });

        // Communicate the disconnection
        socket.on('disconnect', () => {
            socket.to(roomId).emit('user-disconnected', userId)
            socket.to(roomId).emit("createMessage", `${userName} left the room.`, 'Bot');
        })
    })
})

server.listen(port, () => {
    console.log(`Server running at port ` + port);
}); // Run the server on the 3000 port