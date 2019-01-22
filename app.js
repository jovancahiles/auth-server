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

app.use(bodyParser.json()); // parsing application/json

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

app.post('/', (req, res) => {
  // const { data } = req.body
  // const stripeSig = req.headers['stripe-signature']
  console.log('request body', req.body.data.object);
  console.log('merchant', req.body.data.object.merchant_data);

  const {
    id,
    authorization_method,
    authorized_currency,
    pending_authorized_amount,
    card: { metadata: { remainingBudget } },
    merchant_data: { category }
  } = req.body.data.object;

  console.log('remaining Budget', Number(remainingBudget));

  if (
    authorization_method === 'online' &&
    authorized_currency === 'usd' &&
    pending_authorized_amount <= Number(remainingBudget) &&
    category
  ) {
    return stripe.issuing.authorizations.approve(id);
  }
  return stripe.issuing.authorizations.decline(id);
})

app.listen(8080, '0.0.0.0', (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on 80`)
})
