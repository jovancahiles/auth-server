/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */
require('dotenv').config()

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Redis = require('ioredis');
const cors = require('cors');

const client = new Redis({
  sentinels: [{ host: 'dangling-moth-redis-ha.default.svc.cluster.local', port: 26379}],
  name: 'mymaster'
});

const stripe = require('stripe')(process.env.STRIPE_TOKEN);

const networkIds = ['000174101933995', '000445136930994', '000227470792994', '000445191569992'];

app.use(bodyParser.json()); // parsing application/json
app.use(cors());

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

app.post('/authorize', (req, res) => {
  let {
    id,
    authorization_method,
    authorized_currency,
    pending_authorized_amount,
    card: { metadata: { remainingBudget } },
    cardholder,
    merchant_data: { network_id }
  } = req.body.data.object;

  if (
    authorization_method === 'online' &&
    authorized_currency === 'usd' &&
    networkIds.includes(network_id)
  ) {
    client.get(cardholder, (err, reply) => {
      if (!reply) {
        stripe.issuing.authorizations.decline(id);
        res.status(400).send('No such user');
      }
      const budget = reply * 100;
      if (budget > pending_authorized_amount) {
        console.log('would authorize');
        const newBudget = (budget - pending_authorized_amount) / 100;
        client.set(cardholder, newBudget);
        console.log('Responding to authorization', Date.now());
        stripe.issuing.authorizations.approve(id).then((stripeRes) => {
          console.log('responding to authorization succeeded', Date.now());
          res.status(200).send('Authorization approved');
        }).catch((e) => {
          console.log('responding to authorization threw', Date.now());
          console.log('approving the authorization threw', e);
          client.set(cardholder, reply);
          res.status(500).send('Authorization failed');
        });
      } else {
        console.log('would not authorize');
        stripe.issuing.authorizations.decline(id).then((result) => {
          res.status(400).send('Authorization rejected because of insufficient funds');
        });        
      }
    });    
  } else {
    console.log('would not authorize');
    stripe.issuing.authorizations.decline(id);
    res.status(400).send('Authorization rejected');
  }
});

//TODO: Research retry strategy in redis client 


app.post('/setBudget', (req, res) => {
  if (!req.body) res.status(400).send('Bad request');
  const {
    type,
    amount,
    key
  } = req.body;
  if (!type) return res.status(400).send('type is a required parameter');
  if (!amount) return res.status(400).send('amount is a required parameter');
  if (!key) return  res.status(400).send('key is a required parameter');

  switch(type) {
    case 'set':
      client.set(key, amount, (err, reply) => {
        if (err) return res.status(400).send(err);
        res.status(200).send('Budget set successfully');
      });
      break;
    case 'add':
      client.get(key, (err, reply) => {
        if (err) return res.status(400).send(err);
        if (!reply) return res.status(400).send('invalid key');
        const budget = +reply + amount;
        client.set(key, budget, (err, reply) => {
          res.status(200).send('Budget updated successfully');
        });
      });
      break;
    case 'subtract':
      client.get(key, (err, reply) => {
        if (err) return res.status(400).send(err);
        if (!reply) return res.status(400).send('invalid key');
        const budget = +reply - amount;
        client.set(key, budget, (err, reply) => {
          res.status(200).send('Budget updated succesfully');
        });
      });
      break;
    default:
      res.status(400).send('Invalid type parameter');
  }
});

app.post('/getBudget', (req, res) => {
  if (!req.body) res.status(400).send('Bad request');
  const {
    key
  } = req.body;
  if (!key) return  res.status(400).send('key is a required parameter');

  client.get(key, (err, reply) => {
    if (err) return res.status(400).send(err);
    if (!reply) return res.status(400).send('invalid key');
    res.status(200).send({"budget": reply});
  });  
});

app.listen(8080, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on 8080`)
})
