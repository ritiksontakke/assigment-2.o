/* eslint-disable n/no-callback-literal */
const https = require('https')
const { JUDINI_TUTORIAL } = require('../consts.js')
const vscode = require('vscode')
// const { URL_ERRORS } = require('../consts.js')
let isStreaming = false

const createChatCompletion = async ({
  text,
  chatMessages,
  agentId = '',
  lastMessage,
  apiKey,
  callback = () => { },
  uniqueId = '',
  stopTriggered
}) => {
  isStreaming = !stopTriggered
  let notStream = ''
  if (isStreaming) {
    callback({
      type: 'isStreaming',
      ok: true
    })

    const options = {
      hostname: 'plus.codegpt.co',
      port: 443,
      path: agentId === '' ? '/api/v1/agent' : '/api/v1/agent/' + agentId,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey
      }
    }

    const body = {
      messages: chatMessages
    }

    let done = false
    // const timeOuted = false

    const request = https.request(options, function (response) {
      response.on('data', async (chunk) => {
        if (!isStreaming) {
          request.abort()
          done = true
          return
        }
        if (response.statusCode !== 200) {
          const r = JSON.parse(chunk)
          const errorMessage = `CodeGPT Plus API Response was: ${response.statusCode} ${r.error}`
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
        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(chunk) // data: {"data":"hi"}
        if (text.includes('data: [DONE]')) {
          return
        }
        try {
          const datas = text.split('\n\n')
          for (let i = 0; i < datas.length; i++) {
            const data = JSON.parse(datas[i].replace('data: ', ''))
            // console.log(data.data)
            callback({
              type: 'showResponse',
              ok: true,
              text: data.data,
              uniqueId
            })
            notStream += data.data
          }
        } catch (e) {
          // console.error(e, text)
        }
      })
      response.on('error', (e) => {
        if (isStreaming) {
          const errorMessage = `CodeGPT Plus API Response was: Error ${e.message} ${JUDINI_TUTORIAL}`
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
        console.log(response.statusCode)
        isStreaming = false
        done = true
        callback({
          type: 'isStreaming',
          ok: false
        })
      })
    })

    // console.log({ body })
    request.write(JSON.stringify(body))
    request.end()

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

    while (!done) {
      await sleep(200)
    }
    callback({
      type: 'isStreaming',
      ok: false
    })
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
