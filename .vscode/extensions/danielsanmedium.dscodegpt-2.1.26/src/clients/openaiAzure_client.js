/* eslint-disable n/no-callback-literal */
const vscode = require('vscode')
const { URL_ERRORS } = require('../consts.js')
const https = require('https')
let isStreaming = false

const createChatCompletion = async ({
  link,
  apiKey,
  text,
  lastMessage,
  callback = () => { },
  uniqueId = '',
  maxTokens,
  // timeout = 1500,
  // retry = false,
  stopTriggered,
  promptLayerApiKey = '',
  sendEventWithStatusCode = () => { }
}) => {
  isStreaming = !stopTriggered

  if (isStreaming) {
    let id = ''
    const startTime = Date.now()
    callback({
      type: 'isStreaming',
      ok: true
    })

    const { hostname, pathname, search } = new URL(link)
    const model = pathname.split('/')[3]
    const options = {
      hostname,
      port: 443,
      path: pathname + search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      }
    }

    let notStream = ''
    let done = false
    // const timeOuted = false

    const request = https.request(options, function (response) {
      response.on('data', async (chunk) => {
        if (!isStreaming) {
          request.abort()
          done = true
          return
        }

        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(chunk)
        // console.log(text)
        if (text.includes('The model: `' + model + '` does not exist')) {
          const errorMessage = `OpenAI: API Response was: Error ${response.statusCode}: The model: ${model} does not exist ${URL_ERRORS.OpenAI}`
          vscode.window.showErrorMessage(errorMessage)
          callback({
            type: 'showResponse',
            ok: true,
            text: errorMessage,
            uniqueId
          })
          notStream = errorMessage
          return
        }
        if (text.includes('error') && !text.includes('data: ')) {
          const data = JSON.parse(text)
          if (data.error) {
            const errorMessage = `OpenAI API Response was: Error ${response.statusCode}: ${data.error.message} ${URL_ERRORS.OpenAI}`
            vscode.window.showErrorMessage(errorMessage)
            callback({
              type: 'showResponse',
              ok: true,
              text: errorMessage,
              uniqueId
            })
            notStream = errorMessage
            return
          }
        }
        const data = text.split('\n\n').filter((d) => d !== '')
        for (let i = 0; i < data.length; i++) {
          try {
            const element = data[i]
            if (element.includes('data: ')) {
              if (element.includes('[DONE]')) {
                return
              }
              // remove 'data: '
              const data = JSON.parse(element.slice(6))
              if (id === '') {
                id = data.id
              }
              if (data.finish_reason === 'stop') {
                callback({
                  type: 'isStreaming',
                  ok: false
                })
                return
              }
              const openaiResp = data.choices[0].delta.content
              if (openaiResp) {
                callback({
                  type: 'showResponse',
                  ok: true,
                  text: openaiResp.replaceAll('\\n', '\n'),
                  uniqueId
                })
                notStream += openaiResp
              }
            }
          } catch (e) {
            console.error({
              e,
              element: data[i]
            })
          }
        }
      })
      response.on('error', (e) => {
        if (isStreaming) {
          const errorMessage = `OpenAI: API Response was: Error ${e.message} ${URL_ERRORS.OpenAI}`
          vscode.window.showErrorMessage(errorMessage)
          callback({
            type: 'showResponse',
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

    const body = {
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an AI programming assistent. - Follow the user\'s requirements carefully & to the letter. -Then ouput the code in a sigle code block - Minimize any other prose.' + lastMessage
        },
        {
          role: 'user',
          content: text
        }
      ],
      stream: true,
      max_tokens: maxTokens
    }

    /* if (!retry) {
      request.setTimeout(timeout, () => {
        request.abort()
        console.log('timeout ', timeout)
        timeOuted = true
        callback({
          type: 'isStreaming',
          ok: false
        })
      })
    } */
    request.write(JSON.stringify(body))
    request.end()

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    while (!done) {
      /* if (timeOuted) {
        return await createChatCompletion({
          apiKey,
          model,
          text,
          lastMessage,
          callback,
          uniqueId,
          maxTokens,
          timeout: timeout + 300,
          retry: true,
          stopTriggered
        })
      } */
      await sleep(200)
    }
    callback({
      type: 'isStreaming',
      ok: false
    })
    const endTime = Date.now()
    notStream = notStream.replaceAll('\\n', '\n')
    if (promptLayerApiKey) {
      // console.log({ promptLayerApiKey, apiKey })
      const { promptLayer } = require('../utils/promptLayer')
      await promptLayer({
        promptLayerApiKey,
        engine: model,
        messages: body.messages,
        requestResponse: notStream,
        requestStartTime: startTime,
        requestEndTime: endTime,
        resId: id
      })
    }
    return notStream
  } else {
    callback({
      type: 'isStreaming',
      ok: false
    })
  }
  return ''
}

module.exports = {
  createChatCompletion
}
