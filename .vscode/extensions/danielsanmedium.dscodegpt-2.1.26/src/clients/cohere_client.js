/* eslint-disable n/no-callback-literal */
const cohere = require('cohere-ai')
const { URL_ERRORS } = require('../consts.js')
const vscode = require('vscode')
const axios = require('axios')
let isStreaming = false

const createCohereCompletion = async (
  apiKey,
  model,
  oneShotPrompt,
  temperature,
  maxTokens,
  sendEventWithStatusCode = () => {}) => {
  cohere.init(apiKey)

  const completion = await cohere.generate({
    model,
    prompt: oneShotPrompt,
    max_tokens: maxTokens,
    temperature,
    k: 0,
    p: 0.75,
    frequency_penalty: 0,
    presence_penalty: 0,
    stop_sequences: ['USER:']
  }).catch((error) => {
    console.log(error)
    return { isError: true, status: error.status, body: error.response.body }
  })

  const { statusCode, body } = completion
  sendEventWithStatusCode(statusCode)
  if (statusCode !== 200) {
    const httpError = body.message
    const errorMessage = `Cohere: API Response was: Error ${statusCode}: ${httpError} ${URL_ERRORS.Cohere}`
    return errorMessage
  }

  const { generations = [] } = body

  if (generations.length === 0 || generations[0].text === '') {
    vscode.window.showErrorMessage('Cohere: No completion found.')
    return
  }

  return generations[0].text
}

const createCohereChatCompletion = async ({
  text,
  model,
  chatMessages,
  lastMessage,
  apiKey,
  temperature,
  maxTokens,
  callback = () => {
  },
  uniqueId = '',
  stopTriggered,
  sendEventWithStatusCode = () => { }
}) => {
  let notStream = ''
  isStreaming = !stopTriggered
  if (isStreaming) {
    callback({
      type: 'isStreaming',
      ok: true
    })
    try {
      if (model === 'coral') {
        model = 'chat'
      }
      /*
        # add message and answer to the chat history
        user_message = {"user_name": "User", "text": message}
        bot_message = {"user_name": "Chatbot", "text": answer}
      */
      for (let i = 0; i < chatMessages.length; i++) {
        chatMessages[i].user_name = chatMessages[i].role
        chatMessages[i].text = chatMessages[i].content
        delete chatMessages[i].role
        delete chatMessages[i].content
      }

      const response = await axios.post(
        'https://api.cohere.ai/v1/' + model,
        {
          query: text,
          temperature,
          stream: true,
          chat_history: chatMessages,
          return_prompt: true
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          responseType: 'stream'
        }
      )
      const stream = response.data
      stream.on('data', async (chunk) => {
        if (!isStreaming) {
          stream.destroy()
          return
        }
        chunk = chunk.toString()
        const msg = JSON.parse(chunk)
        if (!msg.is_finished && msg.text !== undefined && msg.text !== null) {
          notStream += msg.text
          callback({
            type: 'showResponse',
            ok: true,
            text: msg.text,
            uniqueId
          })
        } else {
          callback({
            type: 'isStreaming',
            ok: false
          })
        }
      })

      sendEventWithStatusCode(response.status)
    } catch (error) {
      callback({
        type: 'isStreaming',
        ok: false
      })
      console.error('Error:', error)
    }
  } else {
    callback({
      type: 'isStreaming',
      ok: false
    })
  }
  return notStream
}

module.exports = { createCohereCompletion, createCohereChatCompletion }
