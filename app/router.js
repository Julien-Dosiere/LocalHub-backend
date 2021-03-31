const express = require('express');
const router = express.Router();
const client = require('./dataSource/client');
const jwt = require('jsonwebtoken');
const storeFile = require('./custom_modules/storeFile');
const seeder = require('./custom_modules/seeder')

let refreshTokens = [];
const temporaryTokenDuration = parseInt(process.env.TEMPORARY_TOKEN_DURATION,10) || 1000;


/**
 * send the API hompage
 */
router.get('/',async (req, res) => {
    res.sendFile('index.html');
})

/**
 * Seeds the DB with <nb> users
 */
router.get('/seeder/user/:nb',async (req, res) => {
    const nb = req.params.nb;
    const accountsCreated = await seeder.user(nb);
    res.json(accountsCreated);
})

/**
 * Seeds the DB with <nb> projects around <place> with <userId> as author
 */
router.get('/seeder/project/:userId/:place/:nb',async (req, res) => {
    const nb = req.params.nb;
    const place = req.params.place;
    const userId = req.params.userId
    const projectsCreated = await seeder.project(userId, place, nb);
    res.json(projectsCreated);
})

/**
 * Handle logging through JWT
 * Reads "email" & "password" in request body and search for relevant user and DB
 * - if user is found: return temporary token, refreshtoken and user infos (in json)
 * - else: send json response with error detail
 */
router.post('/login-refresh',async (req, res) => {
    const { email, password } = req.body;
    try{
        if (!email)
            throw "email/password was not provided";
        const result = await client.query(`
            SELECT 
                id,
                created_at,
                name,
                email,
                avatar 
            FROM users 
            WHERE
                email = $1
            AND 
                password = crypt($2, password)
                `,
            [email, password]);
        if (result.rowCount < 1)
            throw "wrong password or email";
        console.log('\x1b[32m%s\x1b[0m',"User found, logging...");
        const user = result.rows[0];
        const token = jwt.sign({id: user.id}, process.env.TEMPORARY_TOKEN_SECRET, {expiresIn: temporaryTokenDuration});
/////////////////////////////////////// Using optionnal refresh tokens
        const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET);
        refreshTokens.push(refreshToken);
 ///////////////////////////////////////
        res.json({
            token,
            refreshToken, // <-- Using optionnal refresh tokens
            user
        });
    } catch(error) {
        console.log('\x1b[31m%s\x1b[0m', error)
        res.json({"error": error})
    }
});



/**
 * Handle token refresh
 * Reads "refreshToken" in request body and verify it
 * - if valid: return a new temporary token (in json)
 * - else: send json response with error detail
 */
router.post('/token', (req, res) => {
    const { refreshToken } = req.body;
    console.log("Refreshing token")
    if (!refreshToken) {
        return res.json({error:'no refresh token'});
    }
    // console.log(refreshTokens)
    if (!refreshTokens.includes(refreshToken)) {
        return res.status(403).json({error:'refresh token not valid anymore, please re-login'});
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.json({error:'refresh token invalid'});
        }

        const token = jwt.sign({ id: user.id }, process.env.TEMPORARY_TOKEN_SECRET, { expiresIn: temporaryTokenDuration });
        res.status(201).json({
            token
        });
    });
});

// Check authentification token status
//router.use(tokenCheck);


/**
 * Handle logout
 * Reads "refreshToken" in request body and verify it
 * - if valid: remove the refreshtoken from authorized list and send successfull message
 * - else: send error response
 */
router.post('/logout', (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.json({error:'no refresh token'});
    }
    refreshTokens = refreshTokens.filter(token => token !== refreshToken);
    res.json("Logout successful");
});


/**
 * Handle user avatar image upload
 * Reads file/image in request body and check is user is logged in
 * - if ok: store the file in public/avatars folder and update user infos in DB
 * - else: send error response
 */
router.post('/upload-avatar', async (req, res) => {
    try {
        if(!req.files)
            throw {error:{msg:"file is missing", code:5}}

        if(!res.locals.user)
            throw {error:{msg:"authentification problem", code:9}}

        const user = res.locals.user

        let avatar = req.files.avatar;

        console.log(`uploading file "${avatar.name}"`);

        const filePath = await storeFile.dbUpdateAvatar(avatar.name, user.id)

        //Use the mv() method to place the file in upload directory (i.e. "uploads")
        avatar.mv('./public' + filePath);

        //send response
        res.json({
            status: true,
            message: 'File is uploaded',
            data: {
                path: filePath,
                mimetype: avatar.mimetype,
                size: avatar.size
            }
        });

    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', err)

        res.status(500).json(err);
    }
});

/**
 * Handle project image upload
 * Reads file/image & project_id in request body and check is user is logged in
 * - if ok: store the file in public/project-images folder and update project infos in DB
 * - else: send error response
 */
router.post('/upload-image', async (req, res) => {
    try {
        if(!req.files)
            throw {error:{msg:"file is missing", code:5}}

        if(!res.locals.user)
            throw {error:{msg:"authentification problem", code:9}}

        const user = res.locals.user

        let image = req.files.image;

        if(!req.body.project_id)
            throw {error:{msg:"project_id is missing", code:6}}

        const projectId = req.body.project_id;

        console.log(`uploading file "${image.name}"`);

        const filePath = await storeFile.dbUpdate('image', image.name, user.id, projectId)

        image.mv('./public' + filePath);

        res.json({
            status: true,
            message: 'File is uploaded',
            data: {
                path: filePath,
                mimetype: image.mimetype,
                size: image.size
            }
        });

    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', err)

        res.status(500).json(err);
    }
});

/**
 * Handle project file upload
 * Reads file/image & project_id in request body and check is user is logged in
 * - if ok: store the file in public/project-files folder and update project infos in DB
 * - else: send error response
 */
router.post('/upload-file', async (req, res) => {
    try {
        if(!req.files)
            throw {error:{msg:"file is missing", code:5}}

        if(!res.locals.user)
            throw {error:{msg:"authentification problem", code:9}}


        const user = res.locals.user

        let file = req.files.file;


        if(!req.body.project_id)
            throw {error:{msg:"project_id is missing", code:6}}

        let projectId = req.body.project_id;

        console.log(`uploading file "${file.name}"`);

        const filePath = await storeFile.dbUpdate('file', file.name, user.id, projectId)

        file.mv('./public' + filePath);

        res.json({
            status: true,
            message: 'File is uploaded',
            data: {
                path: filePath,
                mimetype: file.mimetype,
                size: file.size
            }
        });

    } catch (err) {
        console.log('\x1b[31m%s\x1b[0m', err)
        res.status(500).json(err);
    }
});






module.exports = router;
