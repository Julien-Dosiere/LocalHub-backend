const faker = require('faker');
const client = require('../dataSource/client');
const axios = require('axios').default;
const queryString = require('query-string');
faker.locale = "fr";


module.exports = {
    /**
     * Create <nb> number of user using faker package for
     * generating random content and store them in DB
     *
     * @param {number} nb
     * @returns {Array} array containing created user emails
     */
    async user(nb){
        try{
            let accountsCreated = []
            for(let i = 0; i < nb; i++) {
                const firstName = faker.name.firstName();
                const lastName = faker.name.lastName();
                const name = `${firstName} ${lastName}`;
                console.log(name);
                const email = `${firstName}.${lastName}@localhub.com`;
                const password = 'password';

                const insertion = await client
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
                    [name, email, password])
                .catch(error => {throw {msg:error.stack,code:error.code}})

                console.log(insertion.rows[0])
                accountsCreated.push(insertion.rows[0].email)
            }
            return accountsCreated;

        } catch(error){
            console.log('\x1b[31m%s\x1b[0m', error)
            throw error
        }
    },

    /**
     * Create <nb> number of projects with  2 random needs
     * around gps coordinates of <place> with <userId> as author Id using faker
     * package for generating random content and store them in DB.
     * Also generates for each project created an
     *
     * @param {Number} userId
     * @param {String} place
     * @param {Number} nb
     * @returns {Array} array containing created projects
     */
    async project(userId, place, nb){
        try{
            // Initializes new project list
            let projectsCreated = []
            // Converts place to GPS coordinates using Nominatim API
            const geo = await this.convertToGeo(place);

            for(let i = 0; i < nb; i++) {
                // Generate dummy datas for a new project
                const title = faker.lorem.words(4);
                const description = faker.lorem.paragraph();
                const expiration_date = faker.date.between('2020-10-01', '2024-01-05')
                // Generate dummy GPS coordinates around place givent in parameter
                const coordinates = faker.address.nearbyGPSCoordinate([geo.lat, geo.long], 8)
                const lat = parseFloat(coordinates[0]);
                const long = parseFloat(coordinates[1]);
                // Convert dummy GPS coordinates to address (city name)
                const location = await this.convertToAddress(lat, long);
                // User ID in parameter is set as project author
                const author = userId;
                // Insert project in DB
                const projectInsertion = await client
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
                    [title, description, expiration_date, location, lat, long, author])
                .catch(error => {throw {msg:error.stack,code:error.code}})
                const projectCreated = projectInsertion.rows[0];
                // Generate 2 needs for each ew project
                projectCreated.need = []
                for(let i = 0; i < 2; i++) {
                    // Generate new need content
                    const title = faker.lorem.words(2);
                    const description = faker.lorem.sentence();
                    // Insert new need in DB
                    const needInsertion = await client
                    .query(`
                        INSERT INTO needs(
                            title, 
                            description, 
                            project_id)
                        VALUES ($1, $2, $3) 
                        RETURNING *`,
                    [title, description, projectCreated.id])
                    .catch(error => {throw {msg:error.stack,code:error.code}})
                    projectCreated.need.push(needInsertion.rows[0])
                }

                projectsCreated.push(projectCreated)
            }
            // Return all new project created with their needs
            return projectsCreated;

        } catch(error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return error
        }
    },

    /**
     * Determine place name related to provided coordinates
     * using Nominaim API
     *
     * @param {Number} lat
     * @param {Number} long
     * @returns {String} name of city or village related to provided coordinates
     */
    async convertToAddress(lat, long) {
        try{
            console.log("convert geo",lat,long)
            const query = queryString.stringifyUrl({
                url: 'https://nominatim.openstreetmap.org/reverse',
                query: {
                  lat: lat,
                  lon: long,
                  format: 'json',
                  zoom: 14,
                  addressdetails: 1,
                },
            });

            const data = await axios
                .get(query)
                .catch((error) => {throw error})

            if(data.data.address.city !== undefined)
                return data.data.address.city
            if(data.data.address.town !== undefined)
                return data.data.address.town
            if(data.data.address.village !== undefined)
                return data.data.address.village
            if(data.data.address.locality !== undefined)
                return data.data.address.locality

        } catch(error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return error
        }
    },

    /**
     * Determine GPS coordinates related to provided address
     * using Nominaim API
     *
     * @param {String} address
     * @returns {Array} array containing lat & long coordinates
     */
    async convertToGeo(address) {
        try{
            console.log("convert geo",address)
            const query = queryString.stringifyUrl({
                url: 'https://nominatim.openstreetmap.org/search',
                query: {
                    adressdetails: 1,
                    q: address,
                    format: 'json',
                    limit: 1,
                },
            });

            const data = await axios
                .get(query)
                .catch((error) => {throw error})
            return {lat:data.data[0].lat, long:data.data[0].lon}
        } catch(error){
            console.log('\x1b[31m%s\x1b[0m', error)
            return error
        }
    }




}

