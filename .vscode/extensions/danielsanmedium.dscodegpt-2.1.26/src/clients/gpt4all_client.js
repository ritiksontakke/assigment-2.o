const { URL_ERRORS } = require('../consts.js')
const vscode = require('vscode')
const { Configuration, OpenAIApi } = require('openai')

const createGPT4allCompletion = async (apiKey, model, oneShotPrompt, temperature, maxTokens, sendEventWithStatusCode = () => {}) => {
  const configuration = new Configuration({ apiKey })
  const openai = new OpenAIApi(configuration)
  openai.basePath = 'http://localhost:4891/v1'
  const completion = await openai.createCompletion({
    model,
    prompt: oneShotPrompt,
    temperature,
    max_tokens: maxTokens,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0,
    stop: ['User:']
  }).catch((error) => {
    console.log(error)
    return { isError: true, status: error.response.status, body: error.response.data.error }
  })
  const { data, status: statusCode, body, isError } = completion
  sendEventWithStatusCode(statusCode)
  if (isError) {
    const httpError = body.message
    const errorMessage = `GPT4All: API Response was: Error ${statusCode}: ${httpError} ${URL_ERRORS.OpenAI}`
    vscode.window.showErrorMessage(errorMessage)
    return errorMessage
  }
  const { usage, choices = [] } = data
  // OpenAI maxToken handler
  if (usage.total_tokens && usage.total_tokens >= maxTokens) {
    vscode.window.showWarningMessage(`Ops! Incomplete Completion.
      The request requires ${usage.total_tokens} tokens and you only have ${maxTokens}. Add more tokens in your CodeGPT Settings.`)
  }
  if (choices.length === 0 || choices[0].text === '') {
    vscode.window.showErrorMessage('GPT4All: No completion found.')
    return 'GPT4All: No completion found.'
  }
  return choices[0].text.replace(oneShotPrompt, '')
}

module.exports = { createGPT4allCompletion }
