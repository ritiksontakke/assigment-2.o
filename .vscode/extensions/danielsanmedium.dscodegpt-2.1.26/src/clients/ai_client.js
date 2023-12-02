const axios = require('axios')
const createChatCompletion = async ({
  text,
  model,
  lastMessage,
  apiKey,
  temperature,
  maxTokens,
  callback = () => {},
  uniqueId = '',
  sendEventWithStatusCode = () => {}
  // stopTriggered
}) => {
  try {
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }

    const body = {
      prompt: text,
      numResults: 1,
      maxTokens,
      temperature,
      topKReturn: 0,
      topP: 1,
      countPenalty: {
        scale: 0,
        applyToNumbers: false,
        applyToPunctuations: false,
        applyToStopwords: false,
        applyToWhitespaces: false,
        applyToEmojis: false
      },
      frequencyPenalty: {
        scale: 0,
        applyToNumbers: false,
        applyToPunctuations: false,
        applyToStopwords: false,
        applyToWhitespaces: false,
        applyToEmojis: false
      },
      presencePenalty: {
        scale: 0,
        applyToNumbers: false,
        applyToPunctuations: false,
        applyToStopwords: false,
        applyToWhitespaces: false,
        applyToEmojis: false
      },
      stopSequences: ['User:']
    }

    const url = `https://api.ai21.com/studio/v1/${model}/complete`

    const response = await axios.post(url, body, { headers })

    sendEventWithStatusCode(response.status)
    // console.log(response)
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'showResponse',
      ok: true,
      text: response.data.completions[0].data.text,
      uniqueId
    })
    return ''
  } catch (error) {
    console.error('Error:', error)
  }
}

module.exports = { createChatCompletion }
