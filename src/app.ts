import express from 'express';
import bodyParser from 'body-parser';
import { addRecipient, removeRecipient } from './manageRecipients';
import { sendEmail, cacheRequest, processCachedRequests } from './sendEmail';
import { getBlockHeight } from './getBlockHeight';

const app = express();
const port = 2016;

app.use(bodyParser.json());

app.post('/add', async (req, res) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
      const email = req.body.email;
      if (email) {
        const response = await addRecipient(email);
        res.send(response);
      } else {
        res.status(400).send('No email provided');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  } catch (error) {
    console.error('Error in /add endpoint:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/remove', async (req, res) => {
  try {
    if (req.headers.authorization === `Bearer ${process.env.ADMIN_PASSWORD}`) {
      const email = req.body.email;
      if (email) {
        const response = await removeRecipient(email);
        res.send(response);
      } else {
        res.status(400).send('No email provided');
      }
    } else {
      res.status(401).send('Unauthorized');
    }
  } catch (error) {
    console.error('Error in /remove endpoint:', error);
    res.status(500).send('Internal Server Error');
  }
});

let currentBlockHeight: number | undefined;
let timer: NodeJS.Timeout | null = null;

app.post('/', async (req, res) => {
  try {
    const txId = req.body.data?.id;
    const parentId = req.body.data?.parent_id;

    if (txId) {
      const blockHeight = await getBlockHeight(txId, parentId);

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
    console.error('Error in / (root) endpoint:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
