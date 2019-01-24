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

const stripe = require('stripe')(process.env.STRIPE_TOKEN);

const networkIds = ['000174101933995', '000445136930994', '000227470792994', '000445191569992'];

app.use(bodyParser.json()); // parsing application/json

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

app.post('/', (req, res) => {
  const {
    id,
    authorization_method,
    authorized_currency,
    pending_authorized_amount,
    card: { metadata: { remainingBudget } },
    merchant_data: { network_id }
  } = req.body.data.object;


  if (
    authorization_method === 'online' &&
    authorized_currency === 'usd' &&
    pending_authorized_amount <= Number(remainingBudget) &&
    networkIds.includes(network_id)
  ) {
    stripe.issuing.authorizations.approve(id);
    res.status(200).send('Authorization approved');
  }
  stripe.issuing.authorizations.decline(id);
  res.status(400).send('Authorization rejected');
})

app.listen(8080, '0.0.0.0', (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on 80`)
})
