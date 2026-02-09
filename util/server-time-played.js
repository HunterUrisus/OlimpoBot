const { MinecraftPlayers, MinecraftPlaytime, sequelize } = require("../dbInit");
const { Op } = require("sequelize");

const getDateFromDaysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

async function getHoursPlayed() {
  return await MinecraftPlaytime.findAll({
    attributes: [
      "player_id",
      [sequelize.fn("sum", sequelize.col("seconds_played")), "total_seconds"],
    ],
    include: [
      {
        model: MinecraftPlayers,
        attributes: ["username"],
      },
    ],
    group: ["player_id", "minecraft_player.id"],
    order: [[sequelize.literal("total_seconds"), "DESC"]],
    limit: 15,
  });
}

async function getWeeklyStats() {
  const sevenDaysAgo = getDateFromDaysAgo(7);

  return await MinecraftPlaytime.findAll({
    attributes: [
      "player_id",
      [sequelize.fn("sum", sequelize.col("seconds_played")), "total_seconds"],
    ],
    where: {
      date: {
        [Op.gte]: sevenDaysAgo,
      },
    },
    include: [
      {
        model: MinecraftPlayers,
        attributes: ["username"],
      },
    ],
    group: ["player_id", "minecraft_player.id"],
    order: [[sequelize.literal("total_seconds"), "DESC"]],
    limit: 15,
  });
}

async function getMonthlyStats() {
  const thirtyDaysAgo = getDateFromDaysAgo(30);

  return await MinecraftPlaytime.findAll({
    attributes: [
      "player_id",
      [sequelize.fn("sum", sequelize.col("seconds_played")), "total_seconds"],
    ],
    where: {
      date: {
        [Op.gte]: thirtyDaysAgo,
      },
    },
    include: [
      {
        model: MinecraftPlayers,
        attributes: ["username"],
      },
    ],
    group: ["player_id", "minecraft_player.id"],
    order: [[sequelize.literal("total_seconds"), "DESC"]],
    limit: 15,
  });
}

async function getLastSeen() {
  return await MinecraftPlayers.findAll({
    attributes: ["username", "last_joined"],
    where: {
      last_joined: {
        [Op.ne]: null,
      },
    },
    order: [["last_joined", "DESC"]],
    limit: 15,
  });
}

module.exports = {
  getHoursPlayed,
  getWeeklyStats,
  getMonthlyStats,
  getLastSeen,
};
