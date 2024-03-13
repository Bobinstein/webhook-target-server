import express from "express";
const { Client, GatewayIntentBits } = require('discord.js');
import "dotenv/config";
const {
  message,
  createDataItemSigner
} = require("@permaweb/aoconnect");
const fs = require("fs")

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const app = express();
const port = 2017;
const wallet = JSON.parse(fs.readFileSync("../KeyFile.json").toString())

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true }));

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]  });
const prefix = "^"

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});



client.on("messageCreate", async function(Message: any) {
  if(Message.author.username == 'bobinstein'){
    const contents = Message.content.replace("<@977981426177814558> ", "")
    console.log(contents)

    await message({
      process: "Bwfa-NTF2oHy9fVbcB5vYgI7h9N9W-FBqkFv1BM5PjM",

      tags: [
        {name: "Origin", value: "MyDiscordBot"},
        {name: "Author", value: Message.author.username}
      ],

      signer: createDataItemSigner(wallet),

      data: contents
    }).then(console.log)


  }
  else {
    console.log("gotta parse better.")
    console.log(Message.author.username)
  }
})





app.post("/discord", async (req: any, res: any) => {

  console.log(req.body)
const channel = client.channels.cache.get(CHANNEL_ID);
await channel.send(`ao process ${req.body.From} sent the message: \n${req.body.Data}`)

res.sendStatus(200)
})

app.get("/discord", async (req: any, res: any) => {
  res.status(200).send("FUUUUUUUUUUUUUCK")
})

app.get("/", async (req: any, res: any) => {
console.log("something connected")
res.status(200).send("This one works")
})




app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});


client.login(DISCORD_TOKEN)