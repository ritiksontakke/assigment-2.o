const axios = require('axios')
const { v4: uuidv4 } = require('uuid')

async function sendEvent (event, data, userId) {
  const body = [{
    event,
    properties: {
      ...data,
      time: Date.now(),
      distinct_id: userId,
      $insert_id: uuidv4()
    }
  }]

  const response = await axios.post('https://playground.judini.ai/api/telemetry', body, {
    headers: {
      'Content-Type': 'application/json'
    }
  }).catch((e) => {
    console.error(e)
  })
  return response.data
}

module.exports = { sendEvent }
