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
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/' + model,
      {
        inputs: text,
        parameters:
        {
          // temperature,
          return_full_text: false,
          max_new_tokens: maxTokens,
          stop: ['User:']
        },
        options:
        {
          use_cache: true,
          wait_for_model: true
        }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        }
      }
    )
    sendEventWithStatusCode(response.status)
    // console.log(response)
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'showResponse',
      ok: true,
      text: response.data[0].generated_text.replace('User:', ''),
      uniqueId
    })
    return ''
  } catch (error) {
    return error
  }
}

module.exports = { createChatCompletion }
