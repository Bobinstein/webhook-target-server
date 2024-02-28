import express from "express";
import bodyParser from "body-parser";
import { addRecipient, removeRecipient } from "./manageRecipients";
import { sendEmail, cacheRequest, processCachedRequests } from "./sendEmail";
import { getBlockHeight } from "./getBlockHeight";
import "dotenv/config";
const { Client, Events, GatewayIntentBits } = require('discord.js');
import Arweave from "arweave";

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const app = express();
const port = 2016;

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]  }); 
client.login(DISCORD_TOKEN)

interface Tag {
  name: string;
  value: string;
}
interface RequestBody {
  data: {
    id: string;
    owner: string;
    tags: Tag[];
  };
}

const arweave = Arweave.init({
  host: "arweave.net",
  port: 443,
  protocol: 'https'
})

app.use(bodyParser.json());

// let isProcessing = false;

app.post("/add", async (req, res) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
      const email = req.body.email;
      if (email) {
        const response = await addRecipient(email);
        res.send(response);
      } else {
        res.status(400).send("No email provided");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  } catch (error) {
    console.error("Error in /add endpoint:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/remove", async (req, res) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
      const email = req.body.email;
      if (email) {
        const response = await removeRecipient(email);
        res.send(response);
      } else {
        res.status(400).send("No email provided");
      }
    } else {
      res.status(401).send("Unauthorized");
    }
  } catch (error) {
    console.error("Error in /remove endpoint:", error);
    res.status(500).send("Internal Server Error");
  }
});

let currentBlockHeight: number | undefined;
let timer: NodeJS.Timeout | null = null;

app.post("/", async (req, res) => {
  
  const body: RequestBody = req.body;

  try {
    // Assuming req.body is properly typed as discussed previously
    const body: RequestBody = req.body;
    console.log(body);
    const address = await arweave.wallets.ownerToAddress(body.data.owner)
    // Step 1: Filter for 'Input' tags and decode them
    const inputs = body.data.tags
      .filter((tag: Tag) => Buffer.from(tag.name, 'base64').toString('ascii') === 'Input')
      .map((tag: Tag) => ({
        name: Buffer.from(tag.name, 'base64').toString('ascii'),
        value: Buffer.from(tag.value, 'base64').toString('ascii')
      }));

    // Step 2: Check if there's exactly one 'Input' tag
    if (inputs.length === 1) {
      // Step 3: Parse the single 'Input' value into JSON
      const inputValue = JSON.parse(inputs[0].value);

      // Further processing here
      // For example, let's say you just log this value for now
      console.log(inputValue);

      // Example of posting to Discord, customize as needed
      const channel = client.channels.cache.get(CHANNEL_ID);
      if (channel && 'send' in channel) {
        const messageToSend = `Contract interaction received with id: ${body.data.id}\nWallet '${address}' attempted to ${inputValue.function}`;
        await channel.send(messageToSend);
        res.sendStatus(200);
      } else {
        res.status(500).send("Channel not found or is not a text channel");
      }
    } else {
      // If there are not exactly one 'Input', do nothing or handle as needed
      console.log("Found multiple or no 'Input' tags, doing nothing.");
      res.sendStatus(200); // Or choose an appropriate response
    }
  } catch (error) {
    console.error('Error in / (root) endpoint:', error);
    res.status(500).send('Internal Server Error');
  }

  // try {

  //   console.log(req.body)
  //   if (!isProcessing) {
  //     isProcessing = true;
  //     await processCachedRequests();
  //     isProcessing = false;
  //   }
  //   const txId = req.body.data?.id;
  //   const parentId = req.body.data?.parent_id;

  //   if (txId) {
  //     const blockHeight = await getBlockHeight(txId, parentId);

  //     if (blockHeight && blockHeight !== currentBlockHeight) {
  //       if (timer) {
  //         clearTimeout(timer);
  //         await processCachedRequests();
  //       }
  //       currentBlockHeight = blockHeight;
  //     }

  //     if (!blockHeight){
  //       console.log("No block height found, so we got here.")
  //     }

  //     if (currentBlockHeight) {
  //       await cacheRequest(currentBlockHeight, JSON.stringify(req.body));
  //       timer = setTimeout(async () => {
  //         await processCachedRequests();
  //         currentBlockHeight = undefined;
  //         timer = null;
  //       }, 120000);
  //     }
  //   }
  //   res.sendStatus(200);
  // } catch (error) {
  //   console.error('Error in / (root) endpoint:', error);
  //   res.status(500).send('Internal Server Error');
  // }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
