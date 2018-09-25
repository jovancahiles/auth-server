/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/api#list_issuing_authorizations
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */

const express = require('express')
const app = express()
const port = 9000

const stripe = require('stripe')(process.env.STRIPE_TOKEN)

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

app.post('/authorize', (req, res) => {
  console.log(req);
  const { authorizationID } = req.body;

  await stripe.issuing.authorizations.approve({ authorizationID },
    (err, authorization) => {
      if (err) throw new Error(err);
      res.send(authorization);
    });

  // deny
  // await stripe.issuing.authorizations.decline({ authorizationID },
  //   (err, authorization) => {
  //     if (err) throw new Error(err);
  //     res.send(authorization);
  //   });
  res.send('Process auth request.')
})

app.get('/list', (req, res) => {
  // const { limit } = req.body;

  // await stripe.issuing.authorizations.list({ limit },
  //   (err, authorization) => {
  //     if (err) throw new Error(err);
  //     res.send(authorization);
  //   });
})

app.get('/get', (req, res) => {
  // const { authorizationID } = req.body;

  // await stripe.issuing.authorizations.retrieve({ authorizationID },
  //   (err, authorization) => {
  //     if (err) throw new Error(err);
  //     res.send(authorization);
  //   });
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})

