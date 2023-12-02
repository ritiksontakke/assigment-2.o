/* eslint-disable n/no-callback-literal */
const https = require('https')
const { URL_ERRORS } = require('../consts.js')
const vscode = require('vscode')
let isStreaming = false

const createChatCompletion = async ({
  apiKey,
  model,
  text,
  chatMessages,
  lastMessage,
  callback = () => { },
  uniqueId = '',
  maxTokens,
  temperature,
  // timeout = 1500,
  // retry = false,
  stopTriggered,
  sendEventWithStatusCode = () => { }
}) => {
  isStreaming = !stopTriggered

  const notStream = ''
  if (isStreaming) {
    callback({
      type: 'isStreaming',
      ok: true
    })
    const options = {
      hostname: 'api.anthropic.com',
      port: 443,
      path: '/v1/complete',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey
      }
    }

    let notStream = ''
    let done = false

    const request = https.request(options, function (response) {
      response.on('data', async (chunk) => {
        if (!isStreaming) {
          request.abort()
          done = true
          return
        }

        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(chunk)
        if (text.includes('data: [DONE]')) {
          return
        }
        try {
          // Dividir el texto en líneas
          const lineas = text.split('\r\n')

          // Obtener la segunda línea que contiene los datos JSON
          const datosJSON = lineas[1].substring(6) // Removemos 'data: ' al inicio

          // Parsear el texto JSON a un objeto JavaScript
          const data = JSON.parse(datosJSON)
          if (data.error) {
            const errorMessage = `Anthropic API Response was: Error ${response.statusCode}: ${data.error.message} ${URL_ERRORS.OpenAI}`
            vscode.window.showErrorMessage(errorMessage)
            callback({
              type: 'showResponse',
              isCompleteText: true,
              ok: true,
              text: errorMessage,
              uniqueId
            })
            notStream += errorMessage
            return
          }
          const claudeMsg = data.completion
          if (claudeMsg) {
            callback({
              type: 'showResponse',
              ok: true,
              text: claudeMsg.replaceAll('\\n', '\n'),
              uniqueId
            })
            notStream += claudeMsg
          }
        } catch (e) {
          console.error(e, text)
        }
      })
      response.on('error', (e) => {
        if (isStreaming) {
          const errorMessage = `Anthropic: API Response was: Error ${e.message} ${URL_ERRORS.OpenAI}`
          vscode.window.showErrorMessage(errorMessage)
          callback({
            type: 'showResponse',
            isCompleteText: true,
            ok: true,
            text: errorMessage,
            uniqueId
          })
          notStream = errorMessage
        }
        callback({
          type: 'isStreaming',
          ok: false
        })
      })
      response.on('end', () => {
        isStreaming = false
        done = true
        callback({
          type: 'isStreaming',
          ok: false
        })
      })

      response.on('close', () => {
        sendEventWithStatusCode(response.statusCode)
      })
    })

    let messages = 'System: I am a helpful programming expert assistant. If you ask me a question that is rooted in truth, I will give you the answer in markdown. Minimize any additional text.\n\n'
    for (let i = 0; i < chatMessages.length; i++) {
      if (chatMessages[i].role === 'user') {
        messages += 'Human: ' + chatMessages[i].content + '\n\n'
      }
      if (chatMessages[i].role === 'assisntant') {
        messages += 'Assistant: ' + chatMessages[i].content + '\n\n'
      }
    }
    messages += 'Assistant:'
    const body = JSON.stringify({
      model,
      prompt: messages,
      stream: true,
      max_tokens_to_sample: maxTokens,
      temperature,
      stop_sequences: ['\n\nHuman:', '\n\nSystem:']
    })

    request.write(body)
    request.end()

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    while (!done) {
      // if (timeOuted) {
      //   return await createChatCompletion({
      //     apiKey,
      //     model,
      //     text,
      //     lastMessage,
      //     callback,
      //     uniqueId,
      //     maxTokens,
      //     temperature,
      //     timeout: timeout + 300,
      //     retry: true
      //   })
      // }
      await sleep(200)
    }
    callback({
      type: 'isStreaming',
      ok: false
    })
    notStream = notStream.replaceAll('\\n', '\n')
    return notStream
  } else {
    callback({
      type: 'isStreaming',
      ok: false
    })
  }
  return notStream
}

module.exports = { createChatCompletion }
