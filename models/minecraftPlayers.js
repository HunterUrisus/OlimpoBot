module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "minecraft_players",
    {
      id: {
        type: DataTypes.STRING,
        primaryKey: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      hours_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      last_joined: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    { timestamps: false },
  );
};
