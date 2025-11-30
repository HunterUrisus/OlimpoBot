const {
  SlashCommandBuilder,
  Collection,
  MessageFlags,
  Client,
} = require("discord.js");

const { Users } = require("../../dbInit");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Comandos de billetera")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("balance")
        .setDescription("Muestra el balance de tu billetera")
        .addBooleanOption((option) =>
          option
            .setName("secret")
            .setDescription("Mostrar el balance de forma privada")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("daily")
        .setDescription("Reclama tu recompensa diaria")
    ).addSubcommand((subcommand) =>
      subcommand
        .setName("transfer")
        .setDescription("Transfiere dinero a otro usuario")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("Usuario al que deseas transferir dinero")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Cantidad de dinero a transferir")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "balance") {
      await handleBalance(interaction);
    } else if (subcommand === "daily") {
      await handleDaily(interaction);
    } else if (subcommand === "transfer") {
      await handleTransfer(interaction);
    }
  },
};

async function handleBalance(interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const balance = await getUserBalance(userId);
  const isSecret = interaction.options.getBoolean("secret");
  if (isSecret) {
    await interaction.editReply({
      content: `Tu balance actual es: $${balance}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await interaction.editReply(`Tu balance actual es: $${balance}`);
}

async function handleDaily(interaction) {
  await interaction.deferReply();

  const userId = interaction.user.id;
  const user = await Users.findByPk(userId);
  const now = new Date();
  
  // Verificar si puede reclamar la recompensa diaria
  if (user && user.lastDailyReward) {
    const lastReward = new Date(user.lastDailyReward);
    const hoursElapsed = (now - lastReward) / (1000 * 60 * 60);
    
    if (hoursElapsed < 24) {
      const hoursRemaining = Math.ceil(24 - hoursElapsed);
      await interaction.editReply(`Ya reclamaste tu recompensa diaria. Vuelve en ${hoursRemaining} horas.`);
      return;
    }
  }
  
  const rewardAmount = Math.floor(Math.random() * (150 - 50 + 1)) + 50; // Recompensa aleatoria entre 50 y 150

  await addDailyReward(userId, rewardAmount);

  await interaction.editReply(`Has reclamado tu recompensa diaria de $${rewardAmount}!`);
}

async function handleTransfer(interaction) { 
  await interaction.deferReply();

  const userId = interaction.user.id;
  const targetUser = interaction.options.getUser("target");
  const amount = interaction.options.getInteger("amount");

  if (targetUser.id === userId) {
    await interaction.editReply("No puedes transferirte dinero a ti mismo.");
    return;
  }

  const senderBalance = await getUserBalance(userId);

  if (amount <= 0) {
    await interaction.editReply("La cantidad a transferir debe ser mayor que cero.");
    return;
  }

  if (senderBalance < amount) {
    await interaction.editReply("No tienes suficiente saldo para realizar esta transferencia.");
    return;
  }

  // Realizar la transferencia
  await transferMoney(userId, targetUser.id, amount);

  await interaction.editReply(`Has transferido $${amount} a ${targetUser.username}.`);
}

async function transferMoney(senderId, receiverId, amount) {
  let sender = await Users.findByPk(senderId);
  let receiver = await Users.findByPk(receiverId);

  if (sender && receiver) {
    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();
  } else if (sender && !receiver) {
    sender.balance -= amount;
    await sender.save();
  } else if (!sender && receiver) {
    receiver.balance += amount;
    await receiver.save();
  }
}

async function getUserBalance(id) {
  const user = await Users.findByPk(id);
  return user ? user.balance : 0;
}

async function addDailyReward(id, amount) {
  let user = await Users.findByPk(id);
  const now = new Date();

  if (user) {
    user.balance += amount;
    user.lastDailyReward = now;
    return await user.save();
  }

  const newUser = await Users.create({ user_id: id, balance: amount, lastDailyReward: now });
  return newUser;
}
