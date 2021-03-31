const { DataSource } = require('apollo-datasource');
const DataLoader = require('dataloader');
const cache = require('../custom_modules/cache');
const timestampsToIso = require('../custom_modules/timestampsToIso')



class UserDataSource extends DataSource {

    constructor() {
        super();
    }
    initialize(config) {
        this.context = config.context;
        this.client = config.context.sqlClient;
    }

    async findAllUsers() {
        const result = await this.client.query('SELECT * FROM users');
        timestampsToIso(result.rows);
        return result.rows;
    }

    async findUserById(userId) {
        const cacheKey = "user"+ userId.toString();
        return cache.wrapper(cacheKey,async () => {
            await this.userLoader.clear(userId)
            return await this.userLoader.load(userId);
        });
    };

    async insertUser(user) {
        try{
            const insertion = await this.client
                .query(`
                    INSERT INTO users(
                        name, 
                        email, 
                        password)
                    VALUES (
                        $1, 
                        $2, 
                        crypt($3,gen_salt('md5'))) 
                    RETURNING *`,
                    [user.name, user.email, user.password])
                .catch(error => {throw {msg:error.stack,code:error.code}})

            timestampsToIso(insertion.rows);

            return insertion.rows[0];

        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            if(error.code === "23505")
                error.msg = "Email already used"
            return{error: error}
        }
    };

    async editUserInfos(newInfos, user) {
        try{
            const update = await this.client
                .query(`
                    UPDATE users
                    SET 
                        name = $1,
                        email = $2
                    WHERE
                        id = $3
                    RETURNING *
                    `,
                    [newInfos.name, newInfos.email, user.id])
                .catch(error => {throw {msg:error.stack,code:error.code}})

            if (!update.rows[0])
                throw {msg:"User not found", code:"10"}
            timestampsToIso(update.rows[0]);

            return update.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };


    async editUserPassword(newInfos, user) {
        try{
            const update = await this.client
            .query(`
                UPDATE users
                SET 
                    password = crypt($1,gen_salt('md5'))
                WHERE
                    id = $2
                RETURNING *
                `,
                [newInfos.password, user.id])
            .catch(error => {throw {msg:error.stack,code:error.code}})

            if (!update.rows[0])
                throw {msg:"User not found", code:"10"}

            timestampsToIso(update.rows[0]);

            return update.rows[0];
     } catch (error) {
        console.log('\x1b[31m%s\x1b[0m', error)
         return{error: error}
     }
    };

    async deleteUser(user) {
        try{
            const deletion = await this.client
            .query(`
                DELETE FROM users
                WHERE
                    id = $1
                RETURNING *
                `,
                [user.id]
                )
            .catch(error => {throw {msg:error.stack,code:error.code}})

            if (!deletion.rows[0])
                throw {msg:"User not found", code:"10"}

            timestampsToIso(deletion.rows[0]);
            return deletion.rows[0];

        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };

    userLoader = new DataLoader(async (ids) => {
        // console.log('Running batch function user Loader with', ids);

        const result = await this.client.query(
            'SELECT * FROM users WHERE id = ANY($1)',
            [ids]);
        const data = ids.map(id => {
            return result.rows.find( author => author.id == id);
        });
        timestampsToIso(data);
        return data;
    });





}

module.exports = UserDataSource;
