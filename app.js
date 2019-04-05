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
const redis = require("redis");

const masterclient = redis.createClient({
  host: 'left-wasp-redis-master.default.svc.cluster.local',
});
masterclient.auth(process.env.REDIS_PASSWORD);

const slaveclient = redis.createClient({
  host: 'left-wasp-redis-slave.default.svc.cluster.local',
});
slaveclient.auth(process.env.REDIS_PASSWORD);

const stripe = require('stripe')(process.env.STRIPE_TOKEN);

const networkIds = ['000174101933995', '000445136930994', '000227470792994', '000445191569992'];

app.use(bodyParser.json()); // parsing application/json

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
    masterclient.get(cardholder, (err, reply) => {
      if (!reply) {
        stripe.issuing.authorizations.decline(id);
        res.status(400).send('No such user');
      }
      const budget = reply * 100;
      if (budget > pending_authorized_amount) {
        console.log('would authorize');
        const newBudget = (budget - pending_authorized_amount) / 100;
        masterclient.set(cardholder, newBudget);
        stripe.issuing.authorizations.approve(id).catch((e) => {
          masterclient.set(cardholder, reply);
        });
        res.status(200).send('Authorization approved');
      } else {
        console.log('would not authorize');
        stripe.issuing.authorizations.decline(id);
        res.status(400).send('Authorization rejected');        
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
      masterclient.set(key, amount, (err, reply) => {
        if (err) return res.status(400).send(err);
        res.status(200).send('Budget set successfully');
      });
      break;
    case 'add':
      slaveclient.get(key, (err, reply) => {
        if (err) return res.status(400).send(err);
        if (!reply) return res.status(400).send('invalid key');
        const budget = +reply + amount;
        masterclient.set(key, budget, (err, reply) => {
          res.status(200).send('Budget updated successfully');
        });
      });
      break;
    case 'subtract':
      slaveclient.get(key, (err, reply) => {
        if (err) return res.status(400).send(err);
        if (!reply) return res.status(400).send('invalid key');
        const budget = +reply - amount;
        masterclient.set(key, budget, (err, reply) => {
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

  slaveclient.get(key, (err, reply) => {
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
