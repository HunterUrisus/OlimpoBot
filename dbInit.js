const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false,
});

const Users = require('./models/users')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => { 
    console.log('Base de datos sincronizada.');
}).catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
});

module.exports = { Users, sequelize };