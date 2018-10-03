/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */
require('dotenv').config()

const express = require('express')
const app = express()
const port = 9000

const bodyParser = require('body-parser')
const stripe = require('stripe')(process.env.STRIPE_TOKEN)

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.get('/', (req, res) => {
  res.send('Brinq - Employee development made easy.')
})

app.post('/authorize', (req, res) => {
  const { type, data } = req.body

  // try {
  //   let sig = req.headers['stripe-signature'];
  //   let ev = stripe.webhooks.constructEvent(req.body, sig, env.endpointSecret);
  //   if (ev) done(null, ev);
  //  } catch (e) {
  //    return res.sendStatus(401);
  //  }

  console.log('----- auth request -----')
  console.log(req.body)
  if(type === 'issuing_authorization.request'){
    console.log('----- auth start -----')
    stripe.issuing.authorizations.approve(data.object.id,
      (err, authorization) => {
        if (err) throw new Error(err)

        console.log('----- auth done -----')
        console.log(authorization)
        res.send(authorization)
    });
  }

  // deny
  // await stripe.issuing.authorizations.decline({ authorizationID },
  //   (err, authorization) => {
  //     if (err) throw new Error(err);
  //     res.send(authorization);
  //   });
  res.status(200).json(req.body);
})

app.post('/approve', (req, res) => {
  const { authID } = req.body
  stripe.issuing.authorizations.approve(authID,
    (err, authorization) => {
      if (err) throw new Error(err)
      res.send(authorization)
  });
})

app.get('/list', (req, res) => {
  const { limit } = req.body;

  stripe.issuing.authorizations.list({ limit },
    (err, authorization) => {
      if (err) throw new Error(err);
      res.send(authorization);
    });
})

app.get('/get', (req, res) => {
  const { authorizationID } = req.body;

  stripe.issuing.authorizations.retrieve({ authorizationID },
    (err, authorization) => {
      if (err) throw new Error(err);
      res.send(authorization);
    });
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})

