

module.exports = (socket, next) => {
    console.log('>> socket.io - connected');

    socket.on('send_message', (message) => {
        // eslint-disable-next-line no-plusplus
        //message.id = ++id;
        //const user = socket.locals.user
        //message.author = user ?? "no user"
        console.log(message);
        //console.log(id);
        socket.emit('send_message', message);

        socket.broadcast.emit('send_message', message);
    });
    socket.on('close', () => {
        console.log(socket.connected);
        console.log('closing socket');
        socket.disconnect(true);
        console.log(socket.connected);
    });
    next();

};
