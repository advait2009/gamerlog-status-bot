require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const util = require("minecraft-server-util");
const cron = require("node-cron");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = "1431553799700480186";

const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows Gamerlog Minecraft server status")
].map(command => command.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log("✅ Slash commands registered.");
  } catch (error) {
    console.error(error);
  }
})();

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);

  // 🌞 Good Morning - 7:00 AM IST
  cron.schedule("0 7 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("🌞 Good Morning Gamerlog!")
        .setDescription(
          "Good Morning everyone! ☀️\n\nHave an amazing day!\n\n🎮 **Server:** `play.gamerlog.fun:25575`\n💙 Enjoy your day!"
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

    } catch (err) {
      console.error(err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // 🌙 Good Night - 11:00 PM IST
  cron.schedule("0 23 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);

      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("DarkBlue")
        .setTitle("🌙 Good Night Gamerlog!")
        .setDescription(
          "Thanks for playing today! 😴\n\nSleep well and see you tomorrow.\n💙 Sweet dreams!"
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });

    } catch (err) {
      console.error(err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "status") {

    try {

      const status = await util.status("play.gamerlog.fun", 25575);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Gamerlog Network")
        .addFields(
          {
            name: "Server",
            value: "`play.gamerlog.fun:25575`"
          },
          {
            name: "Status",
            value: "Online ✅"
          },
          {
            name: "Players",
            value: `${status.players.online}/${status.players.max}`
          },
          {
            name: "Version",
            value: status.version.name
          },
          {
            name: "Ping",
            value: `${status.roundTripLatency} ms`
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🔴 Gamerlog Network")
        .setDescription("Server is currently Offline.");

      await interaction.reply({ embeds: [embed] });

    }

  }

});

client.login(process.env.TOKEN);
