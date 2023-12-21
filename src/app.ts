import express from "express";
import bodyParser from "body-parser";
import { addRecipient, removeRecipient } from "./manageRecipients";
import { sendEmail, cacheRequest, processCachedRequests } from "./sendEmail";
import { getBlockHeight } from "./getBlockHeight";

const app = express();
const port = 2016;

app.use(bodyParser.json());

app.post("/add", async (req, res) => {
  if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
    const email = req.body.email;
    if (email) {
      console.log(`adding recipient ${email}`);
      const response = await addRecipient(email);
      res.send(response);
    } else {
      res.status(400).send("No email provided");
    }
  } else {
    res.status(401).send("Unauthorized");
  }
});

app.post("/remove", async (req, res) => {
  if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
    const email = req.body.email;
    if (email) {
      console.log(`removing recipient ${email}`);
      const response = await removeRecipient(email);
      res.send(response);
    } else {
      res.status(400).send("No email provided");
    }
  } else {
    res.status(401).send("Unauthorized");
  }
});

let currentBlockHeight: number | undefined;
let timer: NodeJS.Timeout | null = null;

app.post("/", async (req, res) => {
  try {
    const txId = req.body.data?.id;
    if (txId) {
      const blockHeight = await getBlockHeight(txId);

      if (blockHeight && blockHeight !== currentBlockHeight) {
        if (timer) {
          clearTimeout(timer);
          await processCachedRequests();
        }
        currentBlockHeight = blockHeight;
      }

      if (currentBlockHeight) {
        await cacheRequest(currentBlockHeight, JSON.stringify(req.body));
        timer = setTimeout(async () => {
          await processCachedRequests();
          currentBlockHeight = undefined;
          timer = null;
        }, 10000);
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error("Error handling POST request:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
