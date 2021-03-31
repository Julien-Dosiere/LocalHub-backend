const { DataSource } = require('apollo-datasource');
const DataLoader = require('dataloader');
const cache = require('../custom_modules/cache');

class FavoriteDataSource extends DataSource {

    constructor() {
        super();
    }

    initialize(config) {

        this.context = config.context;
        this.client = config.context.sqlClient;
    }

    async findFavoriteById(favoriteId) {
        const cacheKey = "favorite"+ favoriteId.toString();
        return cache.wrapper(cacheKey,async () => {
            await this.favoriteLoader.clear(favoriteId)
            return await this.favoriteLoader.load(favoriteId);
        });
    }

    // async findFavoritesByProjectId(projectId) {
    //     const cacheKey = "favoritesByProject"+ projectId.toString();
    //     return cache.wrapper(cacheKey,async () => {
    //         await this.favoritesByProjectLoader.clear(projectId);
    //         return await this.favoritesByProjectLoader.load(projectId);
    //     });
    // }

    async findFavoritesByUserId(userId) {
        // const cacheKey = "favoritesByUser"+ userId.toString();
        // return cache.wrapper(cacheKey,async () => {
            const result = await this.client.query(
                'SELECT * FROM favorites WHERE user_id = $1',
                [userId]);
            const favorites = result.rows;

            return favorites;
        // });
    }

    async findFavoritesByProjectId(projectId) {
        const cacheKey = "favoriteByProject"+ projectId.toString();
        // console.log(`favorite By Project ${projectId}`)
        return cache.wrapper(cacheKey,async () => {
            const result = await this.client.query(
                'SELECT * FROM favorites WHERE project_id = $1',
                [projectId]);
            const favorites = result.rows;

            return favorites;
        });
    }

    // async findProjectById(projectId) {
    //     const cacheKey = "project"+ projectId.toString();
    //     return cache.wrapper(cacheKey,async () => {
    //         await this.projectLoader.clear(projectId)
    //         return await this.projectLoader.load(projectId);
    //     });
    // }

    async insertFavorite(projectId, user) {
        try{
            if(await this.checkIfFavorite(projectId, user))
                throw {msg:"Favorite already exists",code:"whatever"}

            const newFavorite = await this.client
                .query(`
                    INSERT INTO favorites
                        (user_id, project_id)
                    VALUES ($1, $2) 
                    RETURNING *`,
                    [user.id, projectId])
                .catch(error => {throw {msg:error.stack,code:error.code}})
            return newFavorite.rows[0];
        } catch (error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        };

    }

    async deleteFavorite(projectId, user) {
        try{
            if(!await this.checkIfFavorite(projectId, user))
                throw {msg:"Favorite does not exist",code:"whatever"}
            const deletion = await this.client
                .query(`
                    DELETE FROM favorites
                    WHERE user_id = $1
                    AND project_id = $2
                    RETURNING *`,
                    [user.id, parseInt(projectId,10)])
                .catch(error => {throw {msg:error.stack,code:error.code}})
                return deletion.rows[0];
        } catch (error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        };

    };

    async checkIfFavorite(projectId, user) {
        try{
            const favorites = await this.findFavoritesByUserId(user.id)
            const isPresent = favorites.find(favorite => favorite.project_id == projectId)
            if (isPresent)
                return true;
            else
                return false;

        } catch (error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        };
    }



    favoriteLoader = new DataLoader(async (ids) => {
        // console.log('Running batch function favoritesLoader with', ids);

        const result = await this.client.query(
            'SELECT * FROM favorites WHERE id = ANY($1)',
            [ids]);

        const data = ids.map(id => {
            // Je prend le tableau d'id qui m'est passé en paramètre
            // je cherche dans le résultat de ma requête SQL
            // les categories correspondantes histoire d'assurer l'ordre
            return result.rows.find( favorite => favorite.id == id);
        });


        return data;
    });


    // favoritesByProjectLoader = new DataLoader(async (ids) => {
    //     console.log('Running batch function favoritesByProject with', ids);

    //     const result = await this.client.query(
    //         'SELECT * FROM favorites WHERE project_id = ANY($1)',
    //         [ids]);

    //     const data = ids.map(id => {
    //              return result.rows.filter( favorite => favorite.project_id == id);
    //     });
    //     return data;
    // });

    // favoritesByUserLoader = new DataLoader(async (ids) => {
    //     console.log('Running batch function favoritesByUser with', ids);

    //     const result = await this.client.query(
    //         'SELECT * FROM favorites WHERE user_id = ANY($1)',
    //         [ids]);

    //     const favorites = ids.map(id => {
    //              return result.rows.filter(favorite => favorite.user_id == id);
    //     });

    //     return favorites;

    // });


    // projectLoader = new DataLoader(async (ids) => {
    //     console.log('Running batch function project favorites Loader with', ids);
    //     const result = await this.client.query(
    //         'SELECT * FROM projects WHERE id = ANY($1)',
    //         [ids]);

    //     const data = ids.map(id => {
    //         return result.rows.find( project => project.id == id);
    //     });
    //     return data;
    // });

}

module.exports = FavoriteDataSource;
