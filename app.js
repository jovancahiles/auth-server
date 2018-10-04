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
  const stripeSig = req.headers['stripe-signature']

  console.log('----- sig -----')
  console.log(stripeSig)

  try {
    const event = stripe.webhooks.constructEvent(req.body, stripeSig, process.env.STRIPE_WEBHOOK_SECRET)
    if(event){
      console.log('----- event -----')
      console.log(event)
    }
    console.log('event not found')
  }
  catch (err) {
    res.status(400).end()
  }

  // Return a response
  // res.json({received: true});

  // console.log('----- auth: ' + data.object.id + ' -----')
  // if(type === 'issuing_authorization.request'){
  //   await stripe.issuing.authorizations.approve(data.object.id,
  //     (err, authorization) => {
  //       if (err) throw new Error(err)

  //       console.log('----- auth done -----')
  //       console.log(authorization)
        // res.send(authorization)
  //   })
  // }

  // deny
  // await stripe.issuing.authorizations.decline({ authorizationID },
  //   (err, authorization) => {
  //     if (err) throw new Error(err);
  //     res.send(authorization);
  //   });
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

