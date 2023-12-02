const axios = require('axios')
let isStreaming = false
const createChatCompletion = async ({
  text,
  model,
  temperature,
  lastMessage,
  callback = () => {},
  uniqueId = '',
  sendEventWithStatusCode = () => {},
  stopTriggered
}) => {
  isStreaming = !stopTriggered
  if (isStreaming) {
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'isStreaming',
      ok: true
    })
    let notStream = ''
    let done = false
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    try {
      const response = await axios.post(
        'http://localhost:11434/api/generate',
        {
          model,
          options:
          {
            stop: ['User:'],
            temperature
          },
          prompt: lastMessage + '\n' + text
        }, {
          responseType: 'stream'
        }
      )
      const stream = response.data
      stream.on('data', async (chunk) => {
        if (!isStreaming) {
          stream.destroy()
          done = true
          return
        }
        chunk = chunk.toString()
        const msg = JSON.parse(chunk)
        if (!msg.done) {
          notStream += msg.response
          // eslint-disable-next-line n/no-callback-literal
          callback({
            type: 'showResponse',
            ok: true,
            text: msg.response,
            uniqueId
          })
        } else {
          done = true
          // eslint-disable-next-line n/no-callback-literal
          callback({
            type: 'isStreaming',
            ok: false
          })
        }
      })
      sendEventWithStatusCode(response.status)
      while (!done) {
        await sleep(100)
      }
      console.log({ notStream })
      return notStream
    } catch (error) {
      // eslint-disable-next-line n/no-callback-literal
      callback({
        type: 'isStreaming',
        ok: false
      })
      console.error('Error:', error)
    }
  } else {
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'isStreaming',
      ok: false
    })
  }
}

module.exports = { createChatCompletion }
