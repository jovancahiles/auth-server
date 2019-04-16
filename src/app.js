/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */
require('dotenv').config()

const admin = require('firebase-admin');
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const cors = require('cors');

console.log(typeof process.env.FIREBASE_KEY);

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT,
    clientEmail: process.env.FIREBASE_EMAIL,
    privateKey: process.env.FIREBASE_KEY.replace(/\\n/g, '\n').replace(/\\/g, '')
  }),
  databaseURL: "https://brinq-reimbursements.firebaseio.com"
});

const db = admin.firestore();
let running = false;

const budgets = {};
db.collection('budgets').onSnapshot((snapshot) => {
  snapshot.forEach(doc => {
    budgets[doc.id] = doc.data().budget;
  });
  if (!running) {
    app.emit('ready');
  }
});

const stripe = require('stripe')(process.env.STRIPE_TOKEN);

const networkIds = ['000174101933995', '000445136930994', '000227470792994', '000445191569992'];

app.use(bodyParser.json()); // parsing application/json
app.use(cors());

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
  console.log('budgets', budgets);
})

app.post('/authorize', async (req, res) => {
  const start = Date.now();
  let {
    id,
    authorization_method,
    authorized_currency,
    pending_authorized_amount,
    cardholder,
    merchant_data: { network_id }
  } = req.body.data.object;

  if (
    authorization_method === 'online' &&
    authorized_currency === 'usd' &&
    networkIds.includes(network_id)
  ) {
    if (!budgets[cardholder]) {
      stripe.issuing.authorizations.decline(id);
      res.status(400).send('No such user');
    }
    const budget = budgets[cardholder] * 100;
    if (budget > pending_authorized_amount) {
      const newBudget = (budget - pending_authorized_amount) / 100;
      console.log('authorizing', Date.now() - start);
      return await stripe.issuing.authorizations.approve(id).then(async stripeRes => {
        console.log('responding to authorization succeeded', Date.now() - start);
        await db.collection('budgets').doc(cardholder).update({ budget: newBudget });
        res.status(200).send('Authorization approved');
      }).catch((e) => {
        console.log('responding to authorization threw', Date.now() - start);
        console.log('approving the authorization threw', e);
        res.status(500).send('Authorization failed');
      });
    } else {
      console.log('would not authorize');
      return await stripe.issuing.authorizations.decline(id).then((result) => {
        res.status(400).send('Authorization rejected because of insufficient funds');
      });        
    }
  } else {
    console.log('would not authorize');
    stripe.issuing.authorizations.decline(id);
    res.status(400).send('Authorization rejected');
  }
});

app.on('ready', () => {
  app.listen(8080, (err) => {
    if (err) {
      return console.log('something bad happened', err)
    }
    running = true;
    console.log(`server is listening on 8080`)
  });
});
