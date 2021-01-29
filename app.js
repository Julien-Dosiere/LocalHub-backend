require('dotenv').config();
const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const schema = require('./schema');
const resolver = require('./resolver');
const client = require('./dataSource/client');
const dataSources = require('./dataSource');
const cache = require('./dataSource/cache');
const router = require('./router');
const bodyparser = require('body-parser');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const connectRedis = require('connect-redis');
const app = express();
const redis = require('redis');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');



cache.flushAll();

const corsOptions = {
    origin: 'https://madly-elbow.surge.sh',
    credentials: true
}
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://madly-elbow.surge.sh');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader("Access-Control-Allow-Headers", "Referer, Origin, X-Requested-With, Content-Type,Accept, x-client-key, x-client-token, x-client-secret, Authorization, Cookie");
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


app.use(express.static('public'))

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended: true}));
const RedisStore = connectRedis(session);
const redisClient = redis.createClient(process.env.REDIS_URL)

redisClient.on('error', function (err) {
    console.log('Could not establish a connection with redis. ' + err);
});
redisClient.on('connect', function (err) {
    console.log('Connected to redis successfully');
});

app.use(morgan('dev'));
app.use(fileUpload({
    createParentPath: true
}));


const accessTokenSecret = 'youraccesstokensecret';


app.use(router);
// On va venir "créer" notre serveur GraphQL (comme on créérais un router ou l'app express)
const graphQLServer = new ApolloServer({
    // On lui donne le schema
    typeDefs: schema,
    // et les resolvers
    resolvers: resolver,

    // J'injecte dans le "context" notre client sql
    context: ({ req,res }) => {
        // Cette méthode contexte renvoi un objet qui sera passé au DataSource
        // via leur méthode initialze (pour faire l'injection de dépendances)
        const authHeader = req.headers.authorization;
        const user = null;
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            const user ={
                "id": 1,
                "created_at": "2021-01-26T10:18:15.047Z",
                "name": "Michel",
                "email": "michel@michel",
                "avatar": null
              };

            jwt.verify(token, accessTokenSecret, (err) => {
                if (err) {
                    console.log("wrong id");
                }

                user ={
                    "id": 1,
                    "created_at": "2021-01-26T10:18:15.047Z",
                    "name": "Michel",
                    "email": "michel@michel",
                    "avatar": null
                  };
            });
        } else {
            console.log("wrong id");
        }
    
            
        
        if (user !== null) {
            console.log(`user ${user.email} making queries`)
            return {
                sqlClient: client,
                user: user
            };
        } else {
            console.log(`unidendified user making queries`)
            return {
                sqlClient: client,
            };
        }

    },

    // On donne nos dataSources à ApolloServer
    // Il va les "initialize" pour qu'elles récupère leurs dépendances
    // et il va les mettre à disposition des nos resolvers
    // /!\ dataSources à la même structure que context au dessus c'est une fonction
    // qui renvoi un objet !!!!
    dataSources: () => {
        return dataSources;
    }
    // équivalent
    // dataSources: () => dataSources

});


// Et ensuite on passe le middleware associé à express
// chargé sur la route /graphql
// app.use(graphQLServer.getMiddleware());

graphQLServer.applyMiddleware({ app, cors: corsOptions });


app.listen(process.env.PORT || 3000, () => {
    console.log('Server running on :', process.env.PORT);
});