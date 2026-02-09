const Sequelize = require('sequelize');

const sequelize = new Sequelize('database', 'username', 'password', {
    host: 'localhost',
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false,
});

const Users = require('./models/users')(sequelize, Sequelize.DataTypes);
const MinecraftPlayers = require('./models/minecraftPlayers')(sequelize, Sequelize.DataTypes);
const MinecraftPlaytime = require('./models/minecraftPlaytime')(sequelize, Sequelize.DataTypes);

MinecraftPlayers.hasMany(MinecraftPlaytime, {
    foreignKey: 'player_id',
    sourceKey: 'id',
    onDelete: 'CASCADE',
})

MinecraftPlaytime.belongsTo(MinecraftPlayers, {
    foreignKey: 'player_id',
    targetKey: 'id',
    onDelete: 'CASCADE',
})

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => { 
    console.log('Base de datos sincronizada.');
}).catch((error) => {
    console.error('Error al sincronizar la base de datos:', error);
    process.exit(1);
});

module.exports = { Users, MinecraftPlayers, MinecraftPlaytime, sequelize };