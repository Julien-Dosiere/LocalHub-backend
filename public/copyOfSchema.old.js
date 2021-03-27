const { gql } = require('apollo-server-express');

const schema = gql`



type Project {
  
    id: ID! 

    created_at: String!

    updated_at: String!
    
    expiration_date: String!

    title: String!

    description: String!

    location: String!

    lat: Float!

    long: Float!

    image: String

    file: String

    archived: Boolean

    author: User

    needs: [Need]

    comments: [Comment]

    followers: [User]

    isFollowed: Boolean

    userIsAuthor: Boolean

    distance: Float

}

type User {
    id: ID!

    created_at: String!

    updated_at: String!

    name: String!

    email: String!

    password: String!

    avatar: String

    projectsCreated: [Project]

    activated: Boolean

    projectsFollowed: [Project]

}

type Need {
    id: ID!

    title: String!

    description: String!

    completed: Boolean

    project: Project
}

type Comment {
    id: ID!

    created_at: String!

    updated_at: String!

    content: String!

    author: User

    project: Project
}

type Favorite {
    id:ID!
    user: User!
    project: Project!
}


type Payload {
    infos: String
    errors: String
}

type ErrorContent {
    msg: String
    code: String
}

type Error {
    error: ErrorContent!
}

union UserResult = User | Error
union ProjectResult = Project | Error
union NeedResult = Need | Error
union FavoriteResult = Favorite | Error



type Query {

    project(id: ID!): Project
    projectsByGeo(lat: Float!, long: Float!, scope: Float!, archived: Boolean): [Project]
    projects: [Project]

    user(id: ID!): User
    users: [User]
    myInfos: UserResult

    comment(id: ID!): Comment
    comments: [Comment]

    need(id: ID!): Need
    needs: [Need]

    favorite(id: ID!): Favorite
    favorites: [Favorite]


}

# Les mutations sont les requêtes d'écriture (Création, modification, suppression) de GraphQL
type Mutation {

    insertUser(
        name: String!,
        email: String!,
        password: String!
    ): UserResult

    editUserInfos(
        name: String!,
        email: String!,
    ): UserResult

    editUserPassword(
        password: String!
    ): UserResult

    deleteUser: UserResult

    insertProject(
        title: String!,
        description: String!,
        expiration_date: String!,
        location: String!,
        lat: Float!,
        long: Float!,
        image: String,
        file: String,
    ): ProjectResult

    editProject(
        id: ID!,
        title: String!,
        description: String!,
        expiration_date: String!,
        location: String!,
        lat: Float!,
        long: Float!,
        image: String,
        file: String,
    ): ProjectResult

    archiveProject(id: ID!): ProjectResult

    deleteProject(id: ID!): ProjectResult


    insertNeed(
        title: String!

        description: String!

        project_id: ID!
    ): NeedResult

    editNeed(
        id: ID!,
        title: String!,
        description: String!
    ): NeedResult

    deleteNeed(id: ID!): NeedResult

    needCompletion(id: ID!, state: Boolean!): NeedResult

    completeNeed(id: ID!): NeedResult

    uncompleteNeed(id: ID!): NeedResult

    insertFavorite(
        projectId: ID!
    ): FavoriteResult

    deleteFavorite(
        projectId: ID!
    ): FavoriteResult

}
`;


module.exports = schema;