require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const util = require("minecraft-server-util");
const cron = require("node-cron");
const fs = require("fs");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const CHANNEL_ID = "1431553799700480186";

// -------------------- STORAGE --------------------
const DATA_FILE = "./memeChannels.json";

function loadData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// -------------------- SLASH COMMANDS --------------------
const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows Minecraft server status"),

  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Sends a random meme"),

  new SlashCommandBuilder()
    .setName("meme-set")
    .setDescription("Set meme channel for auto memes")
    .addChannelOption(option =>
      option.setName("channel")
        .setDescription("Select meme channel")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("meme-disable")
    .setDescription("Disable auto memes for this server")
].map(c => c.toJSON());

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

// -------------------- MEME API --------------------
async function getMeme() {
  const res = await fetch("https://meme-api.com/gimme");
  return await res.json();
}

async function sendMeme(channel) {
  try {
    const meme = await getMeme();

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle(meme.title)
      .setImage(meme.url)
      .setFooter({ text: `👍 r/${meme.subreddit}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (err) {
    console.error("Meme error:", err);
  }
}

// -------------------- READY --------------------
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} is online!`);

  // 🌞 Good Morning
  cron.schedule("0 7 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("Yellow")
        .setTitle("🌞 Good Morning Gamerlog!")
        .setDescription("Have an amazing day ☀️")
        .setTimestamp();

      channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 🌙 Good Night
  cron.schedule("0 23 * * *", async () => {
    try {
      const channel = await client.channels.fetch(CHANNEL_ID);
      if (!channel) return;

      const embed = new EmbedBuilder()
        .setColor("DarkBlue")
        .setTitle("🌙 Good Night Gamerlog!")
        .setDescription("Sleep well 😴💙")
        .setTimestamp();

      channel.send({ embeds: [embed] });
    } catch (err) {
      console.error(err);
    }
  }, { timezone: "Asia/Kolkata" });

  // 😂 AUTO MEME EVERY 1 HOUR
  setInterval(async () => {
    const data = loadData();

    for (const guildId in data) {
      const channelId = data[guildId];

      try {
        const channel = await client.channels.fetch(channelId);
        if (channel) sendMeme(channel);
      } catch (err) {
        console.error("Auto meme error:", err);
      }
    }
  }, 60 * 60 * 1000);
});

// -------------------- INTERACTIONS --------------------
client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // -------- STATUS --------
  if (interaction.commandName === "status") {
    try {
      const status = await util.status("play.gamerlog.fun", 25575);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🟢 Gamerlog Network")
        .addFields(
          { name: "Server", value: "`play.gamerlog.fun:25575`" },
          { name: "Status", value: "Online ✅" },
          { name: "Players", value: `${status.players.online}/${status.players.max}` },
          { name: "Version", value: status.version.name },
          { name: "Ping", value: `${status.roundTripLatency} ms` }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("Red")
            .setTitle("🔴 Server Offline")
        ]
      });
    }
  }

  // -------- MEME --------
  if (interaction.commandName === "meme") {
    await interaction.deferReply();
    const meme = await getMeme();

    const embed = new EmbedBuilder()
      .setColor("Random")
      .setTitle(meme.title)
      .setImage(meme.url)
      .setFooter({ text: `👍 r/${meme.subreddit}` });

    await interaction.editReply({ embeds: [embed] });
  }

  // -------- MEME SET --------
  if (interaction.commandName === "meme-set") {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ content: "❌ You need Manage Server permission.", ephemeral: true });
    }

    const channel = interaction.options.getChannel("channel");

    const data = loadData();
    data[interaction.guild.id] = channel.id;
    saveData(data);

    await interaction.reply(`✅ Meme channel set to ${channel}`);
  }

  // -------- MEME DISABLE --------
  if (interaction.commandName === "meme-disable") {
    const data = loadData();
    delete data[interaction.guild.id];
    saveData(data);

    await interaction.reply("❌ Auto memes disabled for this server.");
  }
});

client.login(process.env.TOKEN);
