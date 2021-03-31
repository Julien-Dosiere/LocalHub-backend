const { DataSource } = require('apollo-datasource');
const DataLoader = require('dataloader');
const cache = require('../custom_modules/cache');

class NeedDataSource extends DataSource {

    constructor() {
        super();
    }

    // Dans la DataSource on doit obligatoirement implémenter une méthode
    // initialize qui sera appelé par notre serveur apollo pour faire de
    // "l'injection de dépendance"
    initialize(config) {
        // config contiendra 2 propriété
        // - context qui servira à faire passer les dépendances
        // - cache pour la gestion interne
        this.context = config.context;
        this.client = config.context.sqlClient;
    }

    async findAllNeeds() {
        const result = await this.client.query('SELECT * FROM needs');
        return result.rows;
    }

    async findNeedById(needId) {
        await this.needLoader.clear(needId)
        return await this.needLoader.load(needId);
    }

    async findNeedsByProjectId(projectId) {
        await this.needsByProjectLoader.clear(projectId);
        // console.log(`-- Adding ${projectId} to need by project dataloader`);
        return await this.needsByProjectLoader.load(projectId);
    }

    async insertNeed(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);
            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};
            const newNeed = await this.client
                .query(
                    `INSERT INTO needs
                        (title, description, project_id)
                    VALUES ($1, $2, $3) 
                    RETURNING *`,
                    [need.title, need.description, need.project_id])
                .catch(error => {throw {msg:error.stack,code:error.code}})

            return newNeed.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };

    async editNeed(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);
            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};
            const needUpdated = await this.client
            .query(`
                UPDATE needs
                SET
                title = $1,
                description = $2
                WHERE id = $3
                RETURNING *`,
                [need.title, need.description, need.id])
            .catch(error => {throw {msg:error.stack,code:error.code}})
            return needUpdated.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }

    };
    async needCompletion(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);
            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};
            if(userCheck.msg){
                console.log(userCheck)
                throw userCheck
            }
            const needUpdated = await this.client
            .query(`
                UPDATE needs
                SET
                    completed = $1
                WHERE id = $2
                RETURNING *`,
                [need.state, need.id])
            .catch(error => {throw {msg:error.stack,code:error.code}})
            return needUpdated.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }

    };

    async completeNeed(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);
            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};
            if(userCheck.msg){
                console.log(userCheck)
                throw userCheck
            }
            const needUpdated = await this.client
            .query(`
                UPDATE needs
                SET
                    completed = true
                WHERE id = $1
                RETURNING *`,
                [ need.id])
            .catch(error => {throw {msg:error.stack,code:error.code}})
            return needUpdated.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }

    };

    async uncompleteNeed(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);

            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};
            const needUpdated = await this.client
            .query(`
                UPDATE needs
                SET
                    completed = false
                WHERE id = $1
                RETURNING *`,
                [ need.id])
            .catch(error => {throw {msg:error.stack,code:error.code}})
            return needUpdated.rows[0];
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };

    async deleteNeed(need, user) {
        try{
            const userCheck = await this.checkUserPermission(need, user);
            if(!userCheck)
                throw {msg:"Project edit not allowed with this user profile", code:'7'};

            const deletion = await this.client
            .query(`
                DELETE FROM needs
                WHERE
                    id = $1
                RETURNING *
                `,
                [need.id]
                )
            .catch(error => {throw {msg:error.stack,code:error.code}})

            if (!deletion.rows[0])
                throw {msg:"Need not found", code:"10"}

            return deletion.rows[0];

        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };



    needLoader = new DataLoader(async (ids) => {
        //console.log('Running batch function categoriesLoader with', ids);
        // Dans mon loader
        // Je dois trouver un moyen de récupérer les categories correspondants
        // aux id qui me sont donnés

        // On fait une requête SQL pour récupérer un batch de catégorie
        const result = await this.client.query(
            'SELECT * FROM needs WHERE id = ANY($1)',
            [ids]);

        // La fonction ANY ne garantie pas d'ordre on va donc s'assurer de regroupe
        // nos categorie sous la forme d'une tableau
        const data = ids.map(id => {
            // Je prend le tableau d'id qui m'est passé en paramètre
            // je cherche dans le résultat de ma requête SQL
            // les categories correspondantes histoire d'assurer l'ordre
            return result.rows.find( author => author.id == id);
        });
        //console.log(data)
        return data;
    });

    needsByProjectLoader = new DataLoader(async (ids) => {

        //console.log('Running batch function projectsByAuthor with', ids);

        const result = await this.client.query(
            'SELECT * FROM needs WHERE project_id = ANY($1)',
            [ids]);

        // La fonction ANY ne garantie pas d'ordre on va donc s'assurer de regroupe
        // nos post sous la forme d'une tableau
        const data = ids.map(id => {
            // Je prend le tableau d'id qui m'est passé en paramètre
            // je cherche dans le résultat de ma requête SQL
            // les categories correspondantes histoire d'assurer l'ordre
            return result.rows.filter( need => need.project_id == id);
        });

        // Ici je dois renvoyer :
        // [
        //    [la liste des post de category_id 4 ],
        //    [la liste des post de category_id 3 ],
        //    [la liste des post de category_id 5 ]
        // ]
        return data;
    });

    async checkUserPermission(need, user){
        try{
            console.log("checking permission")
            let projectId;
            if(need.project_id === undefined){
                console.log("project_id not found")
                const needToUpdate = await this.findNeedById(need.id)
                if (needToUpdate === undefined)
                    throw {msg:"need to update not found", code:"7"}
                projectId = needToUpdate.project_id;

            }
            else{
                projectId = need.project_id
            }
            const cacheKey = "projectToEdit"+ projectId.toString();
            const projectSearch = await cache.wrapper(cacheKey, async () => {
                return await this.client.query(
                    'SELECT * FROM projects WHERE id = $1',
                    [projectId]);
            });

            const projectToUpdade = projectSearch.rows[0];
            if (!projectToUpdade)
                throw "project to update not found";

            if (projectToUpdade.author !== user.id) {
                console.log('\x1b[31m%s\x1b[0m', "user not authorized")
                return false;
            } else {
                console.log(`user ${user.id} authorized`)
                return true;
            }
        } catch (error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return false
        }
    }


}
module.exports = NeedDataSource;
