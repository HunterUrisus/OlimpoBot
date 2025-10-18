const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("11").setDescription("..."),
  async execute(interaction) {
    await interaction.reply("Chúpalo entonce.");
  },
};
