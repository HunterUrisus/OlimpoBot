module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "minecraft_playtime",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      player_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "minecraft_players",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      seconds_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
    },
    {
      indexes: [
        {
          unique: true,
          fields: ["player_id", "date"],
        },
      ],
    },
  );
};
