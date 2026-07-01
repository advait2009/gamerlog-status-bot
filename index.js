const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Shows Gamerlog Minecraft server status"),

  new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a random meme 😂")
].map(command => command.toJSON());
