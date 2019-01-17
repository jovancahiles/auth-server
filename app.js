/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */
require('dotenv').config()

const express = require('express');
const app = express();

const stripe = require('stripe')(process.env.STRIPE_TOKEN)

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

// app.post('/authorize', (req, res) => {
//   const { type, data } = req.body
//   const stripeSig = req.headers['stripe-signature']
//   console.log('request body', data);

//   console.log(stripeSig)
// })

app.listen(80, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on 3000`)
})

