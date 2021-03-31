const { DataSource } = require('apollo-datasource');
const DataLoader = require('dataloader');
const cache = require('../custom_modules/cache');
const geolib = require('geolib');
const timestampsToIso = require('../custom_modules/timestampsToIso');


class ProjectDataSource extends DataSource {

    constructor() {
        super();
    }

    initialize(config) {
        this.context = config.context;
        this.client = config.context.sqlClient;
    }

    async findAllProjects(user) {
        const data = await this.client.query('SELECT * FROM projects');
        timestampsToIso(data.rows);

        await this.defineUserRelations(data.rows, user);

        return data.rows;
    }

    async findProjectById(projectId, user) {
        // console.log("project by ID search")
        const cacheKey = "projectById"+ projectId.toString();
        const project = await cache.wrapper(cacheKey,async () => {
            await this.projectLoader.clear(projectId)
            return await this.projectLoader.load(projectId);
        });

        await this.defineUserRelations([project], user);
        return project;
    }

    async findProjectsByGeo(lat, long, scope, archived, user) {
        const cacheKey = `projectByGeo:${lat.toString()}|${long.toString()}|${scope}|${archived}`;
        const results = await cache.wrapper(cacheKey,async () => {
            const [geoMin, geoMax] = geolib.getBoundsOfDistance(
                {latitude: lat, longitude: long},
                scope
            )
            const data = await this.client.query(`SELECT * FROM projects 
            WHERE lat > $1
            AND long > $2
            AND lat < $3 
            AND long < $4
            AND (archived = $5
            OR archived = FALSE)
            `, [
                geoMin.latitude,
                geoMin.longitude,
                geoMax.latitude,
                geoMax.longitude,
                archived
            ]);
            timestampsToIso(data.rows);
            return data.rows
        })

        this.defineDistance(results, lat, long);
        await this.defineUserRelations(results, user);
        return results;
    }

    async findProjectsByAuthorId(authorId, user) {
        const cacheKey = "projectsByAuthor"+ authorId.toString();
        const results = await cache.wrapper(cacheKey,async () => {
            await this.projectsByAuthorLoader.clear(authorId);
            return await this.projectsByAuthorLoader.load(authorId);
        });

        await this.defineUserRelations(results, user);



        return results;
    }

    async insertProject(project, user) {
        try{
            const insertion = await this.client
                .query(`
                    INSERT INTO projects(
                        title, 
                        description, 
                        expiration_date, 
                        location, 
                        lat, 
                        long,
                        author)
                    VALUES ($1, $2, $3, $4, $5, $6, $7) 
                    RETURNING *`,
                    [project.title, project.description, project.expiration_date, project.location, project.lat, project.long, user.id])
                .catch(error => {throw {msg:error.stack,code:error.code}})

            timestampsToIso(insertion.rows);

            await this.defineUserRelations(insertion.rows, user);


            return insertion.rows[0];
        } catch (error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        };
    }

    async editProject(project, user) {
        try{
            const projectToUpdade = await this.findProjectById(project.id);
            if (!projectToUpdade)
                throw {msg:"project to update not found", code:"whatever"};

            if (projectToUpdade.author !== user.id)
                throw {msg:"User is not author, project editing not allowed", code: "whatever"};

            const update = await this.client
                .query(`
                    UPDATE projects
                    SET 
                        title = $1, 
                        description = $2, 
                        expiration_date = $3, 
                        location = $4, 
                        lat = $5, 
                        long = $6
                    WHERE id = $7
                    RETURNING *`,
                    [
                        project.title,
                        project.description, project.expiration_date, project.location, project.lat, project.long, project.id])
                .catch(error => {throw {msg:error.stack,code:error.code}})

                timestampsToIso(update.rows);

            await this.defineUserRelations(update.rows, user);

            const updatedProject = update.rows[0]

            return updatedProject;
        } catch(error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };

    async archiveProject(project, user) {
        try{
            const projectToArchive = await this.findProjectById(project.id);
            if (!projectToArchive)
                throw {msg:"project to archive not found", code:"whatever"};

            if (projectToArchive.author != user.id)
                throw {msg:"User is not author, project archiving not allowed", code: "whatever"};

            const update = await this.client
                .query(`
                    UPDATE projects
                    SET 
                        archived = true
                    WHERE id = $1
                    RETURNING *`,
                    [project.id])
                .catch(error => {throw {msg:error.stack,code:error.code}})

                timestampsToIso(update.rows);

            await this.defineUserRelations(update.rows, user);

            const updatedProject = update.rows[0]

            return updatedProject;
        } catch(error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };

    async deleteProject(projectId, user) {
        try{
            const project = await this.findProjectById(projectId);
            if (!project)
                throw {msg: "Project to delete not found", code: 11};

            if (project.author != user.id)
                throw {msg: "Current user is not author, deletion not allowed", code:10};

            const deletion = await this.client
            .query(`
                DELETE FROM projects
                WHERE
                    id = $1
                RETURNING *
                 `,
                [projectId])
            .catch(error => {throw {msg:error.stack,code:error.code}})

            return deletion.rows[0];
        } catch(error) {
            console.log('\x1b[31m%s\x1b[0m', error)
            return{error: error}
        }
    };


    projectLoader = new DataLoader(async (ids) => {
        // console.log('Running batch function project Loader with', ids);
        const result = await this.client.query(
            'SELECT * FROM projects WHERE id = ANY($1)',
            [ids]);

        const data = ids.map(id => {
            return result.rows.find( project => project.id == id);
        });

        timestampsToIso(data);
        return data;
    });

    projectsByAuthorLoader = new DataLoader(async (ids) => {

        // console.log('Running batch function projectsByAuthor with', ids);

        const result = await this.client.query(
            'SELECT * FROM projects WHERE author = ANY($1)',
            [ids]);
        const data = ids.map(id => {
               return result.rows.filter( project => project.author == id);
        });
        timestampsToIso(data[0]);

      return data;
    });

    /**
     * Define relations between project queried and the user making queries
     * Put 2 boolean properties; .userIsAuthor & .isFollowed, on each project
     * of the passed array.
     * @param {Array} projects an array containing projects
     * @param {Object} user a user object (may be undefined)
     * @returns {Array} the array of projects passed in param with added properties
     */
    async defineUserRelations(projects, user){
        try {
            if(projects[0]!== undefined){

                if (user !== undefined){
                    if(user.expired){
                        throw {msg:"session expired",code:1}
                    } else {
                        // console.log(`checking relations for user ${user.id}`)
                        const favorites = await this.findFavoritesByUserId(user.id);
                        const projectsIds = favorites.map(favorite => favorite.project_id)
                        projects.forEach(project => {
                            if (projectsIds.includes(project.id)){
                                project.isFollowed = true;
                            } else {
                                project.isFollowed = false;
                            }
                            if (project.author === user.id){
                                project.userIsAuthor = true;
                            } else {
                                project.userIsAuthor = false;
                            }
                            // console.log(`author: ${project.author},user: ${user.id},
                            // userIsAuthor ${project.userIsAuthor}`)
                        });
                    }
                } else {

                    projects.forEach(project => {
                        project.isFollowed = false;
                        project.userIsAuthor = false;
                    })
                }


            } else {
                console.log("project not found")
            }
        }catch(error){

            throw error
        }
    };
    /**
     * Define distance between search position and projects passed
     * Put 1 .distance property of type float, on each project
     * of the passed array.
     * @param {Array} projects an array containing projects
     * @param {Number} lat search position latiture (float type)
     * @param {Number} long search position longitude (float type)
     * @returns {Array} the array of projects passed in param with distance property
     */
    async defineDistance(projects, lat, long){
        if(projects[0]!== undefined){

                console.log(`calculating project distance`)
                projects.forEach(project => {
                    const latGap = Math.abs(parseFloat(project.lat) - parseFloat(lat))
                    const longGap = Math.abs(parseFloat(project.long) - parseFloat(long))
                    project.distance = latGap + longGap

                });

        }
    };


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

}

module.exports = ProjectDataSource;
