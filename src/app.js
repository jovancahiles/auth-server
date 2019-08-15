/**
 * Stripe Authorization
 * Handle authorization requests made during a card purchase.
 * https://stripe.com/docs/issuing/authorizations#authorization-handling
 *
 */
require("dotenv").config()

const admin = require("firebase-admin")
const express = require("express")
const app = express()
const bodyParser = require("body-parser")
const cors = require("cors")
const axios = require("axios")

console.log(typeof process.env.FIREBASE_KEY)

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT,
    clientEmail: process.env.FIREBASE_EMAIL,
    privateKey: process.env.FIREBASE_KEY.replace(/\\n/g, "\n").replace(
      /\\/g,
      ""
    )
  }),
  databaseURL: "https://brinq-reimbursements.firebaseio.com"
})

const db = admin.firestore()
let running = false

const budgets = {}
db.collection("budgets").onSnapshot(snapshot => {
  snapshot.forEach(doc => {
    budgets[doc.id] = doc.data().budget
  })
  if (!running) {
    app.emit("ready")
  }
})

const stripe = require("stripe")(process.env.STRIPE_TOKEN)

const networkIds = [
  "000174101933995",
  "000445136930994",
  "000227470792994",
  "000445191569992"
]

app.use(bodyParser.json()) // parsing application/json
app.use(cors())

app.get("/", (req, res) => {
  res.send("Brinq - Employee development made easy.")
  console.log("budgets", budgets)
})

app.post("/authorize", async (req, res) => {
  try {
    const start = Date.now()
    let {
      id,
      authorization_method,
      authorized_currency,
      pending_authorized_amount,
      cardholder,
      merchant_data: { network_id }
    } = req.body.data.object

    if (authorization_method === "online" && authorized_currency === "usd") {
      if (!budgets[cardholder]) {
        stripe.issuing.authorizations.decline(id)
        res.status(400).send("No such user")
      }
      const budget = budgets[cardholder] * 100
      if (budget > pending_authorized_amount) {
        const newBudget = (budget - pending_authorized_amount) / 100
        console.log("authorizing", Date.now() - start)
        return await stripe.issuing.authorizations
          .approve(id)
          .then(async stripeRes => {
            console.log(
              "responding to authorization succeeded",
              Date.now() - start
            )
            axios.post(
              "https://hooks.slack.com/services/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",
              {
                text: `Auth server approved authorization of ${pending_authorized_amount} for ${cardholder}. Had ${budget} and now has ${newBudget}`
              }
            )
            await db
              .collection("budgets")
              .doc(cardholder)
              .update({ budget: Number(newBudget.toFixed(2)) })
            res.status(200).send("Authorization approved")
          })
          .catch(e => {
            axios.post(
              "https://hooks.slack.com/services/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",
              {
                text: `Responding to authorization request threw an error from Stripe: ${e} for ${cardholder}`
              }
            )
            console.log("responding to authorization threw", Date.now() - start)
            console.log("approving the authorization threw", e)
            res.status(500).send("Authorization failed")
          })
      } else {
        console.log("would not authorize")
        axios.post(
          "https://hooks.slack.com/services/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",
          {
            text: `Auth server rejected authorization because of insufficient funds. Requested ${pending_authorized_amount} and had ${budget} available budget for ${cardholder}`
          }
        )
        return await stripe.issuing.authorizations
          .decline(id)
          .finally(result => {
            res
              .status(400)
              .send("Authorization rejected because of insufficient funds")
          })
      }
    } else {
      axios.post(
        "https://hooks.slack.com/services/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",
        {
          text: `Auth server rejected authorization because of incorrect authorization_method (${authorization_method}) or authorization_currency (${authorized_currency}) for ${cardholder}`
        }
      )
      console.log("would not authorize")
      stripe.issuing.authorizations.decline(id)
      res.status(400).send("Authorization rejected")
    }
  } finally {
    console.log(e)
    axios.post(
      "https://hooks.slack.com/services/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",
      {
        text: `Auth Server caught an error with the input`
      }
    )
    res.status(400).send(`Malformed input`)
  }
})

app.on("ready", () => {
  app.listen(8080, err => {
    if (err) {
      axios.post(
        "https://hooks.slack.com/services/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",
        {
          text: `Auth server pod errored on restart: ${err}`
        }
      )
      return console.log("something bad happened", err)
    }
    running = true
    console.log(`server is listening on 8080`)
    axios.post(
      "https://hooks.slack.com/services/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",
      {
        text: "Auth server pod restarted successfully"
      }
    )
  })
})
