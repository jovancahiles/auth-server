const express = require('express')
const app = express()
const port = 9000

app.get('/', (request, response) => {
  response.send('Brinq - Employee development made easy.')
})

app.listen(port, (err) => {
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})

