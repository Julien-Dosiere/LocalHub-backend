const jwt = require('jsonwebtoken');
const client = require('../dataSource/client');


module.exports = (socket, next) => {
    console.log('>> socket.io - connected');
    let projectId = null;
    let user = null;

    socket.on('authenticate', async (message) => {
        console.log('Websocket: authenticate');
        try {
            const token = message.token
            if (token === undefined)
                throw {name:"token not present"}

            const user_id = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET,{ignoreExpiration: false}).id;
            console.log('\x1b[32m%s\x1b[0m', "WebSocket authentification successful")
            user = await findUser(user_id)
            next();
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', "Websocket Authentification error")
        }
    });

    socket.on('switch_project', (message) => {
        console.log('Websocket: switching project');
        projectId = message.project_id;
        socket.join(projectId);
    });

    socket.on('add_comment', async (message) => {
        console.log('Websocket: adding commment');

        if (user){
            const savedComment = await saveNewComment(
                user.id,
                message.content,
                projectId)
            const payload = {
                ...savedComment,
                author: user}
            socket.emit('add_comment', payload);
            socket.broadcast.to(projectId).emit('add_comment', payload);
        } else {
            console.log('\x1b[31m%s\x1b[0m', "Message from unidentified user refused," +
                " login required")

        }
    });

    socket.on('delete_comment', async (message) => {
        console.log('Websocket: deleting commment');

        if (user){
            const deletedComment = await saveCommentDeletion(message.id, user.id)
            const payload = deletedComment.id
            socket.emit('delete_comment', payload);
            socket.broadcast.to(projectId).emit('delete_comment', payload);
        } else {
            console.log('\x1b[31m%s\x1b[0m', "Message from unidentified user refused," +
                " login required")
        }
    });

    socket.on('close', () => {
        console.log('closing socket');
        socket.disconnect(true);
    });
    next();
};


/**
 * Find user in database
 * @param userId {number}
 * @returns searched user {Object}
 */
const findUser = async (userId) => {
    try {
        if (!userId)
            throw "user Id problem";
        const result = await client.query(`
                    SELECT id,
                           name,
                           email,
                           avatar
                    FROM users
                    WHERE id = $1
            `,
            [userId]);
        if (result.rowCount < 1)
            throw "user Id problem";
        return result.rows[0];
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', error)
    }
}

/**
 * Save new comment in database
 * @param userId {number}
 * @param content {string}
 * @param projectId {number}
 * @returns inserted comment {Object}
 */
const saveNewComment = async (userId, content, projectId) => {
    try {
        if (!userId)
            throw "authentification problem";
        const result = await client.query(`
                    INSERT INTO 
                        comments(
                            content,
                            project_id,
                            author
                        ) 
                    VALUES ($1, $2, $3)
                    RETURNING *
            `,
            [content, projectId, userId]);
        return result.rows[0];
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', error)
    }
}

/**
 * Delete specified comment in database
 * @param commentId {number}
 * @param userId {number}
 * @returns deleted comment {Object}
 */
const saveCommentDeletion = async (commentId, userId) => {
    try {
        if (!userId)
            throw "authentification problem";
        const search = await client.query(`
                    SELECT * FROM comments
                    WHERE id = $1
            `,
            [commentId]);
        const commentToDelete = search.rows[0];
        if (commentToDelete.author !== userId)
            throw "Unauthorized comment deletion, wrong user"
        const result = await client.query(`
                    DELETE FROM comments
                    WHERE id = $1
                    RETURNING *
            `,
            [commentId]);
        return result.rows[0];
    } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', error)
    }
}
