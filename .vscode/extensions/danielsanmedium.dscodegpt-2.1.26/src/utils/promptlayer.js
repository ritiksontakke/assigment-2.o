const { encode } = require('gpt-3-encoder')
const axios = require('axios')

const promptLayer = async ({
  messages,
  engine,
  requestResponse,
  requestStartTime,
  requestEndTime,
  promptLayerApiKey,
  resId
}) => {
  try {
    const messagesContent = messages[0].content + messages[1].content
    const prompt_tokens = encode(messagesContent).length
    const completion_tokens = encode(requestResponse).length
    const total_tokens = prompt_tokens + completion_tokens

    const cleanRequestResponse = {
      id: resId,
      object: 'chat.completion',
      created: Math.floor(requestStartTime / 1000),
      model: engine,
      usage: {
        prompt_tokens,
        completion_tokens,
        total_tokens
      },
      choices: [
        {
          messages: {
            role: 'assistant',
            content: requestResponse
          }
        }
      ],
      finish_reason: 'stop',
      index: 0
    }

    // console.log({ requestResponse, cleanRequestResponse })

    const requestInput = {
      function_name: 'openai.ChatCompletion.create',
      args: [],
      kwargs: { engine, messages },
      tags: ['codegpt'],
      request_response: cleanRequestResponse,
      request_start_time: Math.floor(requestStartTime / 1000),
      request_end_time: Math.floor(requestEndTime / 1000),
      api_key: promptLayerApiKey
    }

    // console.log(requestInput)

    /* const res = await fetch('https://api.promptlayer.com/track-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(requestInput)
      }) */
    // console.log(res.status)

    const res = await axios.post('https://api.promptlayer.com/track-request', requestInput)
    // console.log(res)
  } catch (e) {
    console.error('promptLayer error', e)
  }
}

module.exports = { promptLayer }
