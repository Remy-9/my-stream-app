const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/remy-majlis', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

let micQueue = [];

io.on('connection', (socket) => {
    
    socket.emit('updateQueue', micQueue);

    socket.on('sendStory', (storyText) => {
        io.emit('displayStory', storyText);
    });

    socket.on('sendTopic', (topicText) => {
        io.emit('displayTopic', topicText);
    });

    socket.on('requestMic', () => {
        const randomId = Math.floor(Math.random() * 900) + 100;
        const participant = { id: socket.id, name: `مجهول #${randomId}` };
        
        if (!micQueue.some(p => p.id === socket.id)) {
            micQueue.push(participant);
            io.emit('updateQueue', micQueue);
        }
    });

    socket.on('removeMic', (id) => {
        micQueue = micQueue.filter(p => p.id !== id);
        io.emit('updateQueue', micQueue);
        io.to(id).emit('micStatus', 'disconnected');
    });

    // === 🔥 استقبال أمر الكتم من الأدمن وتوجيهه للمتابع المعني ===
    socket.on('controlUserMic', ({ userId, mute }) => {
        io.to(userId).emit('userMicControl', { mute: mute });
    });

    // === منطق تمرير إشارات الصوت (WebRTC Signaling) ===
    socket.on('sendSignal', ({ to, signal }) => {
        io.to(to).emit('receiveSignal', { from: socket.id, signal });
    });

    socket.on('disconnect', () => {
        micQueue = micQueue.filter(p => p.id !== socket.id);
        io.emit('updateQueue', micQueue);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`السيرفر يعمل بنجاح على بورت: ${PORT}`);
});