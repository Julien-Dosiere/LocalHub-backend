const { DataSource } = require('apollo-datasource');
const DataLoader = require('dataloader');
const timestampToIso = require('../custom_modules/timestampsToIso')


class CommentDataSource extends DataSource {

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




    async findAllComments() {
        const result = await this.client.query('SELECT * FROM comments');
        return result.rows;
    }
    /**
     *
     * @param {*} commentId
     */
    async findCommentsById(commentId) {
        await this.commentLoader.clear(commentId)
        // console.log(`-- Adding ${commentId} to need dataloader`);
        return await this.commentLoader.load(commentId);
    }

    async findCommentsByProjectId(projectId) {
        await this.commentsByProjectLoader.clear(projectId);
        // console.log(`-- Adding ${projectId} to need by project dataloader`);
        return await this.commentsByProjectLoader.load(projectId);
    }

    commentLoader = new DataLoader(async (ids) => {
        // console.log('Running batch function categoriesLoader with', ids);
          const result = await this.client.query(
            'SELECT * FROM comments WHERE id = ANY($1)',
            [ids]);

          const data = ids.map(id => {
                 return result.rows.find( author => author.id == id);
        });
        timestampToIso(data);

        return data;
    });

    commentsByProjectLoader = new DataLoader(async (ids) => {

        // console.log('Running batch function projectsByProject with', ids);

        const result = await this.client.query(
            'SELECT * FROM comments WHERE project_id = ANY($1)',
            [ids]);

          const data = ids.map(id => {
               return result.rows.filter( comment => comment.project_id == id);
        });

        timestampToIso(data[0]);

        return data;
    });
}

module.exports = CommentDataSource;
