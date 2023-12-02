/* eslint-disable n/no-callback-literal */
const vscode = require('vscode')
const { Configuration, OpenAIApi } = require('openai')
const { URL_ERRORS } = require('../consts.js')
const https = require('https')
const { encode, decode } = require('gpt-3-encoder')
const axios = require('axios')

let isStreaming = false
// const { promptLayer } = require('../utils/promptlayer.js')

const createOpenAiCompletion = async (apiKey, model, oneShotPrompt, temperature, maxTokens) => {
  const configuration = new Configuration({ apiKey })
  const openai = new OpenAIApi(configuration)
  // const requestStartTime = Date.now()
  const completion = await openai.createCompletion({
    model,
    prompt: oneShotPrompt,
    temperature,
    max_tokens: maxTokens,
    top_p: 1.0,
    frequency_penalty: 0.5,
    presence_penalty: 0.0,
    stop: ['USER:']
  }).catch((error) => {
    console.log(error)
    return { isError: true, status: error.response.status, body: error.response.data.error }
  })
  // const requestEndTime = Date.now()

  const { data, status: statusCode, body, isError } = completion
  if (isError) {
    const httpError = body.message
    const errorMessage = `OpenAI: API Response was: Error ${statusCode}: ${httpError} ${URL_ERRORS.OpenAI}`
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
    vscode.window.showErrorMessage('OpenAI: No completion found.')
    return 'OpenAI: No completion found.'
  }

  // Log the request in PromptLayer
  // promptLayer(['prod-code-gpt'], oneShotPrompt, model, completion.data, requestStartTime, requestEndTime)

  return choices[0].text
}

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
  promptLayerApiKey = '',
  orgId = false,
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
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
        ...(orgId && { 'OpenAI-Organization': orgId })
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

    chatMessages.push({
      role: 'system',
      content: "I am a helpful programming expert assistant. If you ask me a question that is rooted in truth, I will give you the answer in markdown. Follow the user's instructions with precision and attention to detail. Provide the code in a single block. Minimize any additional text."
    })

    const body = {
      model,
      messages: chatMessages,
      stream: true,
      max_tokens: maxTokens,
      temperature
    }

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

const createCommitCompletion = async ({
  apiKey,
  model,
  text,
  callback = () => {
  },
  uniqueId = ''
}) => {
  const EXCLUDED_FILES = [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'Pipfile.lock',
    'poetry.lock',
    'Gemfile.lock',
    'composer.lock',
    'Cargo.lock',
    'packages.lock.json',
    'pubspec.lock',
    'mix.lock',
    'gradle.lockfile',
    'Podfile.lock'
  ]
  const MAX_TOKENS = model === 'gpt-4' ? 7000 : 3000

  const SYSTEM_WITHOUT_HISTORY = `
        You are CommitGPT, an AI that converts changes into commit commands. Your responses must adhere to the Conventional Commits format and always use "git add .". Your responses should be always be in the form of a single commit command. You use the following example as a guide (including the backticks):
        ---
        example:
        
        <input>
        diff --git a/package.json b/package.json index c1d0a1d..f8491d7 100644 --- a/package.json +++ b/package.json @@ -34,6 +34,10 @@ ], 'main': './src/extension.js', 'contributes': { + 'permissions': [ + 'camera', + 'microphone' + ], 'viewsContainers': { 'activitybar': [ {
        </input>
        
        <output>
        git add . && git commit -m 'feat: add camera and microphone permissions to package.json' -m 'This commit adds the camera and microphone permissions to the \`permissions\` array in the \`contributes\` section of the \`package.json\` file. This is necessary for the extension to access the user's camera and microphone.'
        </output>
        `
  const SYSTEM_WITH_HISTORY = `
        You are CommitGPT, an AI that combine multiple git commands into single commit command. Your responses must adhere to the Conventional Commits format and always use "git add .". Your responses should be always be in the form of a single commit command. You use the following example as a guide (including the backticks):
        ---
        example using xml as context:
               
        <input>
        git add . && git commit -m 'feat: add camera and microphone permissions to package.json' -m 'This commit adds the camera and microphone permissions to the \`permissions\` array in the \`contributes\` section of the \`package.json\` file. This is necessary for the extension to access the user's camera and microphone.
        git add . && git commit -m 'fix: resolve login issue for mobile users' -m 'This commit addresses a bug that prevented mobile users from logging in successfully by updating the responsive CSS styles and handling touch events properly.'
        git add . && git commit -m 'refactor: improve API error handling' -m 'This commit enhances the error handling within the API layer, providing more detailed error messages to clients and ensuring consistent responses across all endpoints.'
        git add . && git commit -m 'docs: update README with new setup instructions' -m 'This commit updates the README file to include clearer step-by-step instructions on setting up the project, as well as additional information about available configuration options.'
        git add . && git-commit -m 'test: increase test coverage for utils module' -m "This commit adds several unit tests to cover edge cases and previously untested functionality in the utils module, improving overall code quality and reliability."
        git add . && git commit -m 'style: update UI color scheme' -m 'This commit applies a new color scheme across the entire application, resulting in an improved user experience and better visual cohesion. The design update follows the latest brand guidelines.'
        </input> 
        
        <output>
        git add . && git commit -m 'feat: update multiple aspects of the project' -m 'This commit incorporates various improvements such as adding camera and microphone permissions, resolving login issues for mobile users, enhancing API error handling, updating README documentation, increasing test coverage for utils module, and applying a new UI color scheme. These changes improve overall functionality and user experience.'
        </output>
        `

  // split by diff --git a/[filename] b/[filename] line
  const regex = /(?=diff --git a\/[^ ]+ b\/[^ ]+)/g
  const lines = text.split(regex)
  let filteredLines = lines.filter((line) => !EXCLUDED_FILES.some((file) => line.includes(file)))
  const cleanText = filteredLines.join('\n')
  // console.log({ cleanText })
  const tokenLength = filteredLines.reduce((acc, line) => acc + encode(line).length, 0)
  /* console.log({
    tokenLength,
    MAX_TOKENS
  }) */
  let systemMessage
  let body
  if (tokenLength > MAX_TOKENS - 500) {
    // show tokens for each file : filename, tokens
    /* callback({
        type: 'showResponse',
        ok: true,
        text: `The commit you are trying to make is too large. Your commit has ${tokenLength} tokens.`,
        uniqueId,
        isCommit: true,
        isCompleteText: true
      })
      return 'The commit you are trying to make is too large. Your commit has too many tokens.' */

    const tokens = filteredLines.map((line) => {
      const filename = line.split(' b/')[1].split(' ')[0].slice(0, -5)
      const tokens = encode(line).length
      return {
        filename,
        tokens
      }
    })
    // console.log(tokens)

    // if a file is over the limit, show the filename and the number of tokens
    const overLimit = tokens.filter((token) => token.tokens > MAX_TOKENS)
    const commitCommands = []
    if (overLimit.length) {
      const notOverLimit = tokens.filter((token) => token.tokens <= MAX_TOKENS)
      const splitArray = (arr, size) => {
        const result = []

        for (let i = 0; i < arr.length; i += size) {
          const chunk = arr.slice(i, i + size)
          result.push(chunk)
        }

        return result
      }
      for (const file of overLimit) {
        const line = filteredLines.find((line) => line.split(' b/')[1].split(' ')[0] === file.filename + 'index')
        // console.log({ line })
        const splitedByMaxTokens = splitArray(encode(line), MAX_TOKENS)
        for (const chunk of splitedByMaxTokens) {
          const decodedChunk = decode(chunk)
          body = {
            model,
            messages: [
              {
                role: 'system',
                content: SYSTEM_WITHOUT_HISTORY
              },
              {
                role: 'user',
                content: decodedChunk
              }
            ],
            temperature: 0,
            max_tokens: 500
          }

          /* const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
          }) */

          const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`

            }
          })
          if (res.status !== 200) {
            const errorMessage = `OpenAI: API Response was: Error ${res.status}: The model: ${model} does not exist ${URL_ERRORS.OpenAI}`
            vscode.window.showErrorMessage(errorMessage)
            callback({
              type: 'showResponse',
              ok: true,
              text: errorMessage,
              uniqueId,
              isCommit: true,
              isCompleteText: true
            })
            return
          }

          // const resContent = (await res.json()).choices[0].message.content
          const resContent = res.data.choices[0].message.content
          commitCommands.push(resContent)
          // console.log({ lastResponse })
        }
      }
      const filteredLinesBackup = [...filteredLines]
      filteredLines = notOverLimit.map((token) => {
        return filteredLinesBackup.find((line) => line.split(' b/')[1].split(' ')[0] === token.filename + 'index')
      })
      // console.log({ filteredLines })
    }
    try {
      for (const line of filteredLines) {
        body = {
          model,
          messages: [
            {
              role: 'system',
              content: SYSTEM_WITHOUT_HISTORY
            },
            {
              role: 'user',
              content: line
            }
          ],
          temperature: 0,
          max_tokens: 500
        }
        /* const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify(body)
        }) */

        const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          }
        })

        // const resContent = (await res.json()).choices[0].message.content
        const resContent = res.data.choices[0].message.content
        commitCommands.push(resContent)
      }

      body = {
        model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_WITH_HISTORY
          },
          {
            role: 'user',
            content: commitCommands.map((command) => {
              return command.replaceAll('```bash', '').replaceAll('```', '')
            }).join('\n')
          }
        ],
        temperature: 0,
        max_tokens: 500
      }

      /* const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      }) */

      const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      })

      // let resContent = (await res.json()).choices[0].message.content

      let resContent = res.data.choices[0].message.content

      if (!resContent.includes('```bash')) {
        resContent = '```bash\n' + resContent + '\n```'
      }

      callback({
        type: 'showResponse',
        ok: true,
        text: resContent.replaceAll('\\n', '\n'),
        uniqueId,
        isCommit: true,
        isCompleteText: true
      })
    } catch (e) {
      console.error(e)
      callback({
        type: 'showResponse',
        ok: true,
        text: 'Error: ' + e.message,
        uniqueId,
        isCompleteText: true
      })
    }
  } else {
    systemMessage = SYSTEM_WITHOUT_HISTORY
    body = {
      model,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: cleanText
        }
      ],
      temperature: 0,
      max_tokens: 500
    }
    try {
      /* const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body)
      }) */

      const res = await axios.post('https://api.openai.com/v1/chat/completions', body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        }
      })

      if (res.status !== 200) {
        const errorMessage = `OpenAI: API Response was: Error ${res.status}: The model: ${model} does not exist ${URL_ERRORS.OpenAI}`
        vscode.window.showErrorMessage(errorMessage)
        callback({
          type: 'showResponse',
          ok: true,
          text: errorMessage,
          uniqueId,
          isCommit: true,
          isCompleteText: true
        })
        return
      }

      // let resContent = (await res.json()).choices[0].message.content

      let resContent = res.data.choices[0].message.content
      if (!resContent.includes('```bash')) {
        resContent = '```bash\n' + resContent + '\n```'
      }
      callback({
        type: 'showResponse',
        ok: true,
        text: resContent.replaceAll('\\n', '\n'),
        uniqueId,
        isCommit: true,
        isCompleteText: true
      })
    } catch (e) {
      console.error(e)
      callback({
        type: 'showResponse',
        ok: true,
        text: 'Error: ' + e.message,
        uniqueId,
        isCompleteText: true
      })
    }
  }
}

module.exports = {
  createOpenAiCompletion,
  createChatCompletion,
  createCommitCompletion
}
