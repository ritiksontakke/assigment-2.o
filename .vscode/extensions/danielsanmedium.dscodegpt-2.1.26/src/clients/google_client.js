const axios = require('axios')
const createChatCompletion = async ({
  text,
  model,
  chatMessages,
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
    const messages = []
    for (let i = 0; i < chatMessages.length; i++) {
      messages.push({ content: chatMessages[i].content })
    }
    messages.push({ content: 'NEXT REQUEST' })
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta2/models/' + model + ':generateMessage?key=' + apiKey,
      {
        prompt: {
          context: 'I am a helpful programming expert assistant. If you ask me a question that is rooted in truth, I will give you the answer in markdown',
          examples: [{
            input: { content: 'What is an API?' },
            output: { content: 'An API is a set of rules for interacting with software or a service.' }
          }],
          messages
        },
        temperature,
        top_k: 40,
        top_p: 0.95,
        candidate_count: 1
      }
    )
    sendEventWithStatusCode(response.status)
    // console.log(response)
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'showResponse',
      ok: true,
      text: response.data.candidates[0].content,
      uniqueId
    })
    return ''
  } catch (error) {
    console.error('Error:', error)
  }
}

const createCompletion = async ({
  text,
  model,
  lastMessage,
  apiKey,
  temperature,
  maxTokens,
  callback = () => {
  },
  uniqueId = ''
  // stopTriggered
}) => {
  try {
    /*
      curl \
      -H 'Content-Type: application/json' \
      -X POST 'https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key='${API_KEY} \
      -d '{ "prompt": { "text": "hi daniel, who are you ?"}, "temperature": 0.7, "top_k": 40, "top_p": 0.95, "candidate_count": 1, "max_output_tokens": 1024, "stop_sequences": [], "safety_settings": [{"category":"HARM_CATEGORY_DEROGATORY","threshold":1},{"category":"HARM_CATEGORY_TOXICITY","threshold":1},{"category":"HARM_CATEGORY_VIOLENCE","threshold":2},{"category":"HARM_CATEGORY_SEXUAL","threshold":2},{"category":"HARM_CATEGORY_MEDICAL","threshold":2},{"category":"HARM_CATEGORY_DANGEROUS","threshold":2}]}'
    */
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta2/models/' + model + ':generateText?key=' + apiKey,
      {
        prompt: {
          text
        },
        temperature,
        top_k: 40,
        top_p: 0.95,
        candidate_count: 1,
        max_output_tokens: maxTokens,
        stop_sequences: ['User:'],
        safety_settings: [
          {
            category: 'HARM_CATEGORY_DEROGATORY',
            threshold: 1
          },
          {
            category: 'HARM_CATEGORY_TOXICITY',
            threshold: 1
          },
          {
            category: 'HARM_CATEGORY_VIOLENCE',
            threshold: 1
          },
          {
            category: 'HARM_CATEGORY_SEXUAL',
            threshold: 1
          },
          {
            category: 'HARM_CATEGORY_MEDICAL',
            threshold: 1
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS',
            threshold: 1
          }
        ]
      }
    )
    // console.log(response)
    // eslint-disable-next-line n/no-callback-literal
    callback({
      type: 'showResponse',
      ok: true,
      text: response.data.candidates[0].output,
      uniqueId
    })
    return ''
  } catch (error) {
    console.error('Error:', error)
  }
}

module.exports = { createChatCompletion, createCompletion }
