const vscode = require('vscode')
const prompts = require('./utils/prompts.js')
const openAIClient = require('./clients/openai_client.js')
const azureOpenAIClient = require('./clients/openaiAzure_client.js')
const cohereClient = require('./clients/cohere_client.js')
const aiClient = require('./clients/ai_client.js')
const anthropicClient = require('./clients/anthropic_client.js')
const judiniClient = require('./clients/judini_client.js')
const gpt4allClient = require('./clients/gpt4all_client.js')
const ollamaClient = require('./clients/ollama_client.js')
const huggingfaceClient = require('./clients/huggingface_client.js')
const googleClient = require('./clients/google_client.js')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const axios = require('axios')
const polka = require('polka')
const { v4: uuidv4 } = require('uuid')
const { sendEvent } = require('./utils/telemetry.js')

// OpenAI - Cohere API Key
const API_KEY = 'API_KEY'

class ChatSidebarProvider {
  constructor (context) {
    this._view = null
    this._extensionUri = context.extensionUri
    this._vscode = vscode
    this._context = context
    this._userName = context.globalState.get('githubUsername')
    this._accessToken = context.secrets.get('accessToken')
    this.refreshToken = context.secrets.get('refreshToken')
    this._judiniApiKey = context.secrets.get('judiniApiKey')
    this._userProfilePic = context.globalState.get('userProfilePic')
    this._uuid = context.globalState.get('uuid')
    this._currentProvider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')
    this._lastProvider = context.globalState.get('lastProvider')
    this._lastModel = context.globalState.get('lastModel')
  }

  static getChatInstance (context) {
    if (!ChatSidebarProvider._instance && context) {
      ChatSidebarProvider._instance = new ChatSidebarProvider(context)
      console.log('Congratulations, your extension "codegpt" is now active!')
    }
    return ChatSidebarProvider._instance
  }

  get view () {
    return this._view
  }

  get clearChat () {
    this._view.webview.postMessage({ type: 'clearChat' })
  }

  async loginGithub () {
    const app = polka()
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
      next()
    })
    app.get('/auth/:accessToken/:refreshToken/:userName/:userProfilePic/:judiniApiKey/:uuid', async (req, res) => {
      console.log(req.params)
      await this._context.globalState.update('githubUsername', decodeURIComponent(req.params.userName))
      await this._context.secrets.store('accessToken', req.params.accessToken)
      await this._context.secrets.store('refreshToken', req.params.refreshToken)
      await this._context.secrets.store('judiniApiKey', req.params.judiniApiKey)
      await this._context.globalState.update('userProfilePic', decodeURIComponent(req.params.userProfilePic))
      await this._context.globalState.update('uuid', req.params.uuid)
      await this._context.globalState.update('codeGPTUserId', req.params.uuid)

      await this._context.globalState.update('history', '')

      this._lastProvider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')
      this._lastModel = vscode.workspace.getConfiguration().get('CodeGPT.model')
      this._currentProvider = 'CodeGPT Plus'

      await vscode.workspace.getConfiguration().update('CodeGPT.apiKey', 'CodeGPT Plus', vscode.ConfigurationTarget.Global)
      await vscode.workspace.getConfiguration().update('CodeGPT.model', 'CodeGPT Plus', vscode.ConfigurationTarget.Global)

      vscode.commands.executeCommand('workbench.action.reloadWindow')
      // <script>function closeWindow(){window.close();}</script>
      res.end('<body style="background-color: #1e1e1e; color: white; font-family: sans-serif; text-align: center; padding-top: 100px;"><h1>CodeGPT Plus</h1><h2>Thank you for signing in!</h2><p>You can close this window now.</p></body>')

      const codeGPTUserId = req.params.uuid
      const codeGPTVersion = this._context.extension.packageJSON.version
      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')

      const mixPanelData = {
        userType: this._uuid ? 'registered' : 'anonymous',
        language,
        codeGPTVersion
      }

      await sendEvent('LoggedIn_vscode', mixPanelData, codeGPTUserId)
      app.server.close()
    })

    app.listen(54111, async (err) => {
      if (err) throw vscode.window.showErrorMessage(err)
      let codeGPTUserId = this._uuid ?? await this._context.globalState.get('codeGPTUserId')
      console.log({ codeGPTUserId })

      if (!codeGPTUserId) {
        codeGPTUserId = uuidv4()
        this._context.globalState.update('codeGPTUserId', codeGPTUserId)
      }
      const codeGPTVersion = this._context.extension.packageJSON.version
      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')

      const mixPanelData = {
        userType: this._uuid ? 'registered' : 'anonymous',
        language,
        codeGPTVersion
      }

      sendEvent('ClickLoginButton_vscode', mixPanelData, codeGPTUserId)
    })
  }

  async logoutGithub () {
    try {
      // const req = await axios.get('https://api-account.judini.ai/auth/logout', { headers: { Authorization: `Bearer ${(await this._accessToken)}` } })

      // if (req.data === true) {
      await this.forceLogOutCodeGPTPlus()
      // }
    } catch (error) {
      console.error(error)
      vscode.window.showErrorMessage(error.message)
    }
  }

  async forceLogOutCodeGPTPlus () {
    await this._context.globalState.update('githubUsername', '')
    await this._context.secrets.delete('accessToken')
    await this._context.secrets.delete('refreshToken')
    await this._context.secrets.delete('judiniApiKey')
    await this._context.globalState.update('userProfilePic', '')
    await this._context.globalState.update('uuid', '')
    vscode.window.showInformationMessage('Ending session...')
    await this._context.globalState.update('history', '')

    vscode.workspace.getConfiguration().update('CodeGPT.apiKey', this._lastProvider, vscode.ConfigurationTarget.Global)
    vscode.workspace.getConfiguration().update('CodeGPT.model', this._lastModel, vscode.ConfigurationTarget.Global)
    this._currentProvider = this._lastProvider
    setTimeout(() => {
      vscode.commands.executeCommand('workbench.action.reloadWindow')
    }, 3000)
  }

  resolveWebviewView (webviewView) {
    this._view = webviewView
    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true
    }

    this._update()

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview)
  }

  async _update () {
    if (!this._view) {
      return
    }

    this._view.webview.html = this._getHtmlForWebview(this._view.webview)

    let codeGPTVersion = this._context.extension.packageJSON.version
    let codeGPTUserId = this._uuid ?? await this._context.globalState.get('codeGPTUserId')
    if (!codeGPTUserId) {
      codeGPTVersion = this._context.extension.packageJSON.version
      codeGPTUserId = uuidv4()
      this._context.globalState.update('codeGPTUserId', codeGPTUserId)
      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')
      sendEvent('userCreated', {
        userType: 'anonymous',
        language,
        codeGPTVersion
      }, codeGPTUserId)
    }

    let response
    let oneShotPrompt

    this._view.webview.onDidReceiveMessage(async (data) => {
      this._currentProvider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')
      const provider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')
      const windowMemory = vscode.workspace.getConfiguration().get('CodeGPT.windowMemory')
      let azureLink, azureApi
      if (provider === 'Azure') {
        azureLink = await this._context.secrets.get('AZURE_LINK')
        azureApi = await this._context.secrets.get('AZURE_API_KEY')
      }
      const model = vscode.workspace.getConfiguration().get('CodeGPT.model')
      const apiKeyFirstTime = await this._context.globalState.get('apiKeyFirstTime')
      // resetear cuenta
      // const oldApiKey = 'lala'
      // await this._context.globalState.update('apiKeyFirstTime', '')
      // await this._context.secrets.store(API_KEY, oldApiKey)
      // await this._context.secrets.delete(API_KEY + '_' + provider)
      // End resetear cuenta
      if (apiKeyFirstTime !== 'true') {
        const oldApiKey = await this._context.secrets.get(API_KEY)
        const apiKey = await this._context.secrets.get(API_KEY + '_' + provider)
        if (oldApiKey && !apiKey) {
          await this._context.secrets.store(API_KEY + '_' + provider, oldApiKey)
        }
        await this._context.secrets.delete(API_KEY)
        await this._context.globalState.update('apiKeyFirstTime', 'true')
      }
      const apiKey = await this._context.secrets.get(API_KEY + '_' + provider) ?? await this._judiniApiKey
      let judiniApi = await this._judiniApiKey
      const promptLayerApiKey = await this._context.secrets.get('PROMPT_LAYER_API_KEY')
      const orgId = vscode.workspace.getConfiguration().get('CodeGPT.organizationId')
      const temperature = vscode.workspace.getConfiguration().get('CodeGPT.temperature')
      const maxTokens = vscode.workspace.getConfiguration().get('CodeGPT.maxTokens')
      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')

      if (!apiKey && !['Azure', 'Ollama', 'GPT4All'].includes(provider) && data.type === 'sendPrompt') {
        vscode.window.showWarningMessage('Enter your ' + provider + ' API Key with the Set API Key command')
        return 'Please enter your api key, go to https://codegpt.co for more information.'
      }

      const mixPanelData = {
        userType: this._uuid ? 'registered' : 'anonymous',
        provider,
        model,
        language,
        codeGPTVersion
      }

      const sendEventWithStatusCode = (statusCode) => {
        const fullData = {
          ...mixPanelData,
          statusCode
        }
        sendEvent(data.promptType || 'Chat', fullData, codeGPTUserId)
      }

      // console.log(data)
      switch (data.type) {
        case 'sendPrompt': {
          let chatMessagesView = []

          if (data.messages) {
            chatMessagesView = data.messages.slice(0, -1).map((m, i) => ({
              role: i % 2 === 0 ? 'user' : 'assistant',
              content: m.trim()
            }))
          }

          // last window Message
          let chatMessages = []
          if (chatMessagesView.length > windowMemory) {
            chatMessages = chatMessagesView.slice(-windowMemory)
          } else {
            chatMessages = chatMessagesView
          }

          const uniqueId = data.uniqueId
          let message = data.text
          let lastMessage = data.lastMessage
          const promptType = data.promptType

          // check if it have a selected text

          let selectedText = ''
          const { activeTextEditor } = vscode.window
          if (activeTextEditor) {
            const { document } = activeTextEditor

            const { selection } = activeTextEditor
            selectedText = document.getText(selection)
          } else {
            console.log('No active text editor found.')
          }

          try {
            if (lastMessage !== '') {
              lastMessage = ' -Respond about this context ### ' + lastMessage
            }
            if (selectedText !== '') {
              if (!promptType) {
                message = message + ' -Respond about this code ### ' + selectedText
              } else {
                message = prompts.getCommandPrompt(message, promptType, language)
              }
              // add the action to the chat
              chatMessages.push({
                role: 'user',
                content: message
              })
            }
            if (provider === 'OpenAI' && (model === 'gpt-3.5-turbo' || model === 'gpt-3.5-turbo-0301' || model === 'gpt-4' || model === 'gpt-4-32k' || model === 'gpt-3.5-turbo-16k')) {
              if (apiKey === undefined || apiKey === '') {
                vscode.window.showWarningMessage('Enter your ' + provider + ' API Key with the Set API Key command')
                this._view.webview.postMessage({
                  type: 'showResponse',
                  ok: true,
                  text: 'Please enter your api key, go to https://codegpt.co for more information.',
                  uniqueId
                })
                return
              }
              if (data.isCommit) {
                // console.log('is commit')
                await openAIClient.createCommitCompletion({
                  apiKey,
                  model,
                  text: message,
                  lastMessage,
                  maxTokens,
                  callback: (message) => { // send message to the webview
                    this._view.webview.postMessage(message)
                  },
                  uniqueId,
                  isCommit: data.isCommit
                })
                sendEvent('commit', mixPanelData, codeGPTUserId)
              } else {
                await openAIClient.createChatCompletion({
                  apiKey,
                  model,
                  text: message,
                  chatMessages,
                  lastMessage,
                  maxTokens,
                  callback: (message) => { // send message to the webview
                    this._view.webview.postMessage(message)
                  },
                  uniqueId,
                  stopTriggered: data.stop,
                  promptLayerApiKey,
                  orgId,
                  sendEventWithStatusCode
                })
              }
            } else {
              // no chat options, we have to create the prompt
              if (provider === 'OpenAI') {
                // openai davinci-003
                oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                response = await openAIClient.createOpenAiCompletion(apiKey, model, oneShotPrompt, temperature, maxTokens)
              } else if (provider === 'Cohere') {
                if (model === 'coral') {
                  response = await cohereClient.createCohereChatCompletion({
                    text: message,
                    apiKey,
                    model,
                    chatMessages,
                    lastMessage,
                    temperature,
                    maxTokens,
                    callback: (messageCallback) => { // send message to the webview
                      this._view.webview.postMessage(messageCallback)
                    },
                    uniqueId,
                    stopTriggered: data.stop,
                    sendEventWithStatusCode
                  })
                } else {
                  // command models
                  oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                  response = await cohereClient.createCohereCompletion(
                    apiKey,
                    model,
                    oneShotPrompt,
                    temperature,
                    maxTokens,
                    sendEventWithStatusCode
                  )
                }
              } else if (provider === 'AI21') {
                // Progress Location init
                const progressOptions = {
                  location: vscode.ProgressLocation.Notification,
                  title: 'CodeGPT',
                  cancellable: true
                }

                await vscode.window.withProgress(progressOptions, async (progress, token) => {
                  // if the progress is canceled
                  if (token.isCancellationRequested) return

                  // Update the progress bar
                  oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                  progress.report({ message: 'I am thinking...' })
                  response = await aiClient.createChatCompletion({
                    text: oneShotPrompt,
                    apiKey,
                    model,
                    lastMessage,
                    temperature,
                    maxTokens,
                    callback: (messageCallback) => { // send message to the webview
                      console.log('callback: ')
                      console.log(messageCallback.text)
                      this._view.webview.postMessage(messageCallback)
                    },
                    uniqueId,
                    sendEventWithStatusCode
                  })

                  progress.report({
                    increment: 100,
                    message: ''
                  })
                }).then(undefined, err => {
                  response = 'Error: ' + err
                })
              } else if (provider === 'HuggingFace') {
                // Progress Location init
                const progressOptions = {
                  location: vscode.ProgressLocation.Notification,
                  title: 'CodeGPT',
                  cancellable: true
                }

                await vscode.window.withProgress(progressOptions, async (progress, token) => {
                  // if the progress is canceled
                  if (token.isCancellationRequested) return

                  // Update the progress bar
                  oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                  progress.report({ message: 'I am thinking...' })
                  response = await huggingfaceClient.createChatCompletion({
                    text: oneShotPrompt,
                    apiKey,
                    model,
                    lastMessage,
                    temperature,
                    maxTokens,
                    callback: (messageCallback) => { // send message to the webview
                      console.log('callback: ')
                      console.log(messageCallback.text)
                      this._view.webview.postMessage(messageCallback)
                    },
                    uniqueId,
                    sendEventWithStatusCode
                  })

                  progress.report({
                    increment: 100,
                    message: ''
                  })
                }).then(undefined, err => {
                  response = 'Error: ' + err
                })
              } else if (provider === 'Ollama') {
                oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                await ollamaClient.createChatCompletion({
                  text: oneShotPrompt,
                  model,
                  lastMessage,
                  temperature,
                  callback: (messageCallback) => { // send message to the webview
                    this._view.webview.postMessage(messageCallback)
                  },
                  uniqueId,
                  stopTriggered: data.stop,
                  sendEventWithStatusCode
                })
              } else if (provider === 'CodeGPT Plus') {
                if (judiniApi === 'undefined' && this._userName) {
                  vscode.window.showErrorMessage('Please login to CodeGPT Plus to configure your account and log-in again', 'Go!').then((sel) => {
                    if (sel === 'Go!') { vscode.env.openExternal(vscode.Uri.parse('https://plus.codegpt.co/')) }
                  })
                  return
                }
                // chat models
                const CodeGPTapiKey = await this._context.secrets.get(API_KEY + '_' + 'CodeGPT Plus')
                if (!judiniApi || judiniApi === 'undefined') {
                  if (!CodeGPTapiKey) {
                    vscode.window.showErrorMessage('Please check CodeGPT extension settings to configure the right provider')
                    return
                  } else {
                    judiniApi = CodeGPTapiKey
                  }
                }
                oneShotPrompt = message
                const agentId = data.agentId
                await judiniClient.createChatCompletion({
                  text: oneShotPrompt,
                  chatMessages,
                  lastMessage,
                  apiKey: judiniApi,
                  agentId,
                  callback: (message) => { // send message to the webview
                    this._view.webview.postMessage(message)
                  },
                  uniqueId,
                  stopTriggered: data.stop
                })
              } else if (provider === 'Anthropic') {
                // chat models
                oneShotPrompt = message
                await anthropicClient.createChatCompletion({
                  apiKey,
                  model,
                  chatMessages,
                  text: oneShotPrompt,
                  lastMessage,
                  maxTokens,
                  temperature,
                  callback: (message) => {
                    this._view.webview.postMessage(message)
                  },
                  uniqueId,
                  stopTriggered: data.stop,
                  sendEventWithStatusCode
                })
              } else if (provider === 'GPT4All') {
                // Progress Location init
                const progressOptions = {
                  location: vscode.ProgressLocation.Notification,
                  title: 'CodeGPT',
                  cancellable: true
                }

                await vscode.window.withProgress(progressOptions, async (progress, token) => {
                  // if the progress is canceled
                  if (token.isCancellationRequested) return

                  // Update the progress bar
                  progress.report({ message: 'I am thinking...' })

                  // modelos sin chat
                  oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                  response = await gpt4allClient.createGPT4allCompletion(apiKey, model, oneShotPrompt, temperature, maxTokens)

                  progress.report({
                    increment: 100,
                    message: ''
                  })
                }).then(undefined, err => {
                  response = 'Error: ' + err
                })
              } else if (provider === 'Google') {
                // Progress Location init
                const progressOptions = {
                  location: vscode.ProgressLocation.Notification,
                  title: 'CodeGPT',
                  cancellable: true
                }

                await vscode.window.withProgress(progressOptions, async (progress, token) => {
                  // if the progress is canceled
                  if (token.isCancellationRequested) return

                  // Update the progress bar
                  if (model === 'chat-bison-001') {
                    oneShotPrompt = message
                    progress.report({ message: 'I am thinking...' })
                    response = await googleClient.createChatCompletion({
                      text: oneShotPrompt,
                      apiKey,
                      model,
                      chatMessages,
                      lastMessage,
                      temperature,
                      maxTokens,
                      callback: (messageCallback) => { // send message to the webview
                        console.log('callback: ')
                        console.log(messageCallback.text)
                        this._view.webview.postMessage(messageCallback)
                      },
                      uniqueId
                    })
                  } else if (model === 'text-bison-001') {
                    // modelos sin chat
                    oneShotPrompt = prompts.getCommandPrompt(message, 'chatCodeGPT', language)
                    response = await googleClient.createCompletion({
                      text: oneShotPrompt,
                      apiKey,
                      model,
                      lastMessage,
                      temperature,
                      maxTokens,
                      callback: (messageCallback) => { // send message to the webview
                        console.log('callback: ')
                        console.log(messageCallback.text)
                        this._view.webview.postMessage(messageCallback)
                      },
                      uniqueId
                    })
                  }

                  progress.report({
                    increment: 100,
                    message: ''
                  })
                }).then(undefined, err => {
                  response = 'Error: ' + err
                })
              } else if (provider === 'Azure') {
                oneShotPrompt = message
                await azureOpenAIClient.createChatCompletion({
                  link: azureLink,
                  apiKey: azureApi,
                  text: oneShotPrompt,
                  lastMessage,
                  callback: (messageCallback) => { // send message to the webview
                    this._view.webview.postMessage(messageCallback)
                  },
                  uniqueId,
                  maxTokens,
                  stopTriggered: data.stop,
                  promptLayerApiKey,
                  sendEventWithStatusCode
                })
              } else {
                if (!response) {
                  response = `${provider} API could not process the query`
                }
              }
            }
          } catch (error) {
            response = `${provider} API Response was: ${error}`
            vscode.window.showErrorMessage(response)
          }
          if (response) {
            this._view.webview.postMessage({
              type: 'showResponse',
              ok: true,
              text: response,
              uniqueId
            })
          }
          break
        }
        case 'saveHistory': {
          const history = data.history
          this._context.globalState.update('history', history)
          break
        }
        case 'clearHistory': {
          this._context.globalState.update('history', '')
          if (data.agentId) {
            const agents = this._context.globalState.get('agents') || ''
            const newAgents = agents.map((agent) => ({
              ...agent,
              isSelected: agent.id === data.agentId
            }))
            this._context.globalState.update('agents', newAgents)
          }
          this._view.webview.html = this._getHtmlForWebview(this._view.webview)
          break
        }
        case 'openSettings': {
          const settingsCommand = 'workbench.action.openSettings'
          vscode.commands.executeCommand(settingsCommand, 'codegpt')
          break
        }
        case 'openGithubAuth': {
          await this.loginGithub()
          const settingsCommand = 'vscode.open'
          vscode.commands.executeCommand(settingsCommand, 'https://account.codegpt.co/external-signin')
          break
        }
        case 'openGithubLogout': {
          await this.logoutGithub()
          break
        }
        case 'insertCode': {
          const { code } = data
          const { activeTextEditor } = vscode.window
          // console.log({ activeTextEditor })
          if (activeTextEditor) {
            const { selection } = activeTextEditor
            activeTextEditor.edit((editBuilder) => {
              editBuilder.replace(selection, code)
            })
          }
          sendEvent('insertCode', mixPanelData, codeGPTUserId)
          break
        }
        case 'newFileWithCode': {
          const { code } = data
          const newDocument = await vscode.workspace.openTextDocument({
            content: '',
            language: ''
          })
          await vscode.window.showTextDocument(newDocument)
          const { activeTextEditor } = vscode.window
          if (activeTextEditor) {
            const { selection } = activeTextEditor
            activeTextEditor.edit((editBuilder) => {
              editBuilder.replace(selection, code)
            })
          }
          sendEvent('newFileWithCode', mixPanelData, codeGPTUserId)
          break
        }
        case 'commitCode': {
          const getWorkspaceFolder = () => {
            const { workspaceFolders } = vscode.workspace
            return workspaceFolders ? workspaceFolders[0].uri.fsPath : ''
          }
          const { stdout } = await exec(data.text, { cwd: getWorkspaceFolder() })
          // console.log({ stdout })
          this._view.webview.postMessage({
            type: 'showResponse',
            ok: true,
            text: '\n' + stdout.split('] ')[1],
            isCommit: true,
            uniqueId: data.uniqueId
          })
          break
        }
        case 'updateAgentCodeGPT': {
          const CodeGPTapiKey = await this._context.secrets.get(API_KEY + '_' + 'CodeGPT Plus')
          if (judiniApi === 'undefined' && this._userName) {
            vscode.window.showErrorMessage('Please login to CodeGPT Plus to configure your account and log-in again', 'Go!').then((sel) => {
              if (sel === 'Go!') { vscode.env.openExternal(vscode.Uri.parse('https://plus.codegpt.co/')) }
            })
          }
          if (!judiniApi || judiniApi === 'undefined') {
            if (!CodeGPTapiKey) {
              vscode.window.showErrorMessage('Please login to CodeGPT Plus to see your agents')
            } else {
              judiniApi = CodeGPTapiKey
            }
          }
          try {
            const response = await axios.get('https://plus.codegpt.co/api/v1/agent/', {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + judiniApi
              }
            })

            const data = response.data

            console.log('data', data)

            const agent = data.map((agent) => ({
              ...agent,
              isSelected: false
            }))
            // name:string, id: string}[]

            this._context.globalState.update('agents', agent)
            vscode.window.showInformationMessage(agent.length + ' agents updated correctly')
          } catch (e) {
            this._context.globalState.update('agents', [])
            console.log('error updating agents', e.message)
            vscode.window.showErrorMessage('Error updating agents')
          }
          this._view.webview.html = this._getHtmlForWebview(this._view.webview)
          this._view.webview.postMessage({
            type: 'agentCodeGPT',
            ok: true
          })
          break
        }
      }
    })
  }

  authSection () {
    // const userIcon = '<svg width="16px" height="16px" stroke-width="1.2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" color="#ffffff"><path d="M5 20v-1a7 7 0 017-7v0a7 7 0 017 7v1M12 12a4 4 0 100-8 4 4 0 000 8z" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
    // We check if there is a set Session
    if (!this._userName && this._currentProvider !== 'CodeGPT Plus') {
      return '<a href="#" class="btn-conCodeGPTPlus" id="btn-sync-github">Connect to CodeGPT Plus</a>'
    } else {
      return ''
    }
  }

  authButtonOnCodeGPTPlusProvider () {
    console.log(this._currentProvider)
    if (!this._userName && this._currentProvider === 'CodeGPT Plus') {
      return '<a href="#" class="btn-conCodeGPTPlus" id="btn-sync-github">Connect to CodeGPT Plus</a>'
    } else {
      return ''
    }
  }

  logoutSection () {
    return !this._userName ? '' : '<div id="agentButtons"><a href="https://plus.codegpt.co">Playground</a><a href="#" id="btn-logout-github">Logout</a></div>'
  }

  _getHtmlForWebview (webview) {
    console.log('getHtmlForWebview')
    const nonce = this._getNonce()
    const styleVscode = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'vscode.css'))
    // const styleMain = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'main.css'))
    const scriptChat = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat.js'))
    const styleChat = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'chat.css'))
    const flex = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'flex.css'))
    const styleGithubDark = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'github_dark.css'))
    const highlightMinJs = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'highlight.min.js'))
    const markedMindJs = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'marked.min.js'))
    const showdownJs = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'media', 'showdown.min.js'))

    const sendButtonSvg = '<svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M8.08074 5.36891L10.2202 7.50833L4.46802 7.50833L4.46802 8.50833L10.1473 8.50833L8.08073 10.5749L8.78784 11.282L11.7444 8.32545L11.7444 7.61835L8.78784 4.6618L8.08074 5.36891Z"/><path d="M8 14C4.68629 14 2 11.3137 2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14ZM8 13C10.7614 13 13 10.7614 13 8C13 5.23858 10.7614 3 8 3C5.23858 3 3 5.23858 3 8C3 10.7614 5.23858 13 8 13Z"/></svg>'
    const botSvg = '<svg width="24" height="24" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M8.48 4h4l.5.5v2.03h.52l.5.5V8l-.5.5h-.52v3l-.5.5H9.36l-2.5 2.76L6 14.4V12H3.5l-.5-.64V8.5h-.5L2 8v-.97l.5-.5H3V4.36L3.53 4h4V2.86A1 1 0 0 1 7 2a1 1 0 0 1 2 0 1 1 0 0 1-.52.83V4zM12 8V5H4v5.86l2.5.14H7v2.19l1.8-2.04.35-.15H12V8zm-2.12.51a2.71 2.71 0 0 1-1.37.74v-.01a2.71 2.71 0 0 1-2.42-.74l-.7.71c.34.34.745.608 1.19.79.45.188.932.286 1.42.29a3.7 3.7 0 0 0 2.58-1.07l-.7-.71zM6.49 6.5h-1v1h1v-1zm3 0h1v1h-1v-1z"/></svg>'

    const authSection = this.authSection()
    const logoutSection = this.logoutSection()
    const authButtonOnCodeGPTPlusProvider = this.authButtonOnCodeGPTPlusProvider()

    const history = this._context.globalState.get('history') || ''
    const agents = this._context.globalState.get('agents') || ''

    const agentIcon = '<svg id="agentIcon" width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M4.5 1L4 1.5V3.02746C4.16417 3.00932 4.331 3 4.5 3C4.669 3 4.83583 3.00932 5 3.02746V2H14V7H12.2929L11 8.29289V7H8.97254C8.99068 7.16417 9 7.331 9 7.5C9 7.669 8.99068 7.83583 8.97254 8H10V9.5L10.8536 9.85355L12.7071 8H14.5L15 7.5V1.5L14.5 1H4.5Z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M6.41705 10.4288C7.37039 9.80348 8 8.72527 8 7.5C8 5.567 6.433 4 4.5 4C2.567 4 1 5.567 1 7.5C1 8.72527 1.62961 9.80348 2.58295 10.4288C2.11364 10.6498 1.68557 10.9505 1.31802 11.318C0.900156 11.7359 0.568688 12.232 0.342542 12.7779C0.180451 13.1692 0.0747425 13.5807 0.0278638 14C0.00933826 14.1657 0 14.3326 0 14.5V15H1L0.999398 14.5C0.999398 14.4784 0.999599 14.4567 1 14.4351C1.00811 13.9975 1.09823 13.5651 1.26587 13.1604C1.44179 12.7357 1.69964 12.3498 2.0247 12.0247C2.34976 11.6996 2.73566 11.4418 3.16038 11.2659C3.57088 11.0958 4.00986 11.0056 4.45387 10.9997C4.46922 10.9999 4.4846 11 4.5 11C4.5154 11 4.53078 10.9999 4.54613 10.9997C4.99014 11.0056 5.42912 11.0958 5.83962 11.2659C6.26433 11.4418 6.65024 11.6996 6.9753 12.0247C7.30036 12.3498 7.55821 12.7357 7.73413 13.1604C7.90177 13.5651 7.99189 13.9975 8 14.4351C8.0004 14.4567 8.0006 14.4784 8.0006 14.5L8 15H9V14.5C9 14.3326 8.99066 14.1657 8.97214 14C8.92526 13.5807 8.81955 13.1692 8.65746 12.7779C8.43131 12.232 8.09984 11.7359 7.68198 11.318C7.31443 10.9505 6.88636 10.6498 6.41705 10.4288ZM4.5 10C3.11929 10 2 8.88071 2 7.5C2 6.11929 3.11929 5 4.5 5C5.88071 5 7 6.11929 7 7.5C7 8.88071 5.88071 10 4.5 10Z"/></svg>'

    const initialTemplate = this._userName && this._currentProvider === 'CodeGPT Plus'
      ? `
    <div class="initialTemplate">
      <div class="wrapper ai">
          <div class="chat">
            <div class="profile chat_header">
              ${botSvg} <span>CodeGPT Plus</span>
            </div>
            <p>
              Welcome <b>${this._userName}!</b><br>
              Unlock the full potential of CodeGPT Plus (Beta) to tailor AI Agents for your company or specific topics.
            </p>
            <p>
              Click the icon ${agentIcon} in the toolbar to access the <a target="_blank" href="https://plus.codegpt.co/">CodeGPT Plus Playground</a>. There, you can generate new AI Agents or pick one to interact with.
            </p>
            <p>
              Remember, to begin, just highlight some code and choose one of these options:
            </p>
            <ul>
                <li>✨<button>Explain the selected code.</button></li>
                <li>✨<button>Identify any issues in my selected code.</button></li>
                <li>✨<button>Create unit tests for my selected code.</button></li>
            </ul>
            <p>
              We're looking forward to your <a target="_blank" href="https://besi4.r.a.d.sendibm1.com/mk/cl/f/sh/SMK1E8tHeG13DkCbtglC1c6xbGsQ/THLlkrvafwtY">feedback</a> and <a target="_blank" href="https://docs.google.com/forms/d/e/1FAIpQLSdx1Mt3O8Caa9BUeuZlQmBW082gAdIVmCSsLbqHh285-7eJZA/viewform">BUG reports</a>.<br>
              ✨ CodeGPT Team
            </p>
          </div>
      </div>
    </div>
    `
      : `
    <div class="initialTemplate">
      <div class="wrapper ai">
        <div class="chat">
          <div class="profile chat_header">
            ${botSvg} <span>CodeGPT</span>
          </div>
          <p>
              Hi, I'm CodeGPT, your coding sidekick!. Feel free to ask me any coding related questions.
          </p>
          <p>
              To get started, simply select a section of code and choose one of the following options:
          </p>
          <ul>
              <li>✨<button>Explain the selected code.</button></li>
              <li>✨<button>Identify any issues in my selected code.</button></li>
              <li>✨<button>Create unit tests for my selected code.</button></li>
          </ul>
          <p>
              If you want to learn more about me, check out the <a href="https://docs.codegpt.co/docs/tutorial-basics/installation" target="_blank">Documentation</a>
          </p>
          <button id="btn-settings">Settings</button>
          <p>
            Big news 😱! Now you can access to our Free Plan of <a href="https://account.codegpt.co/auth/register" target="_blank">CodeGPT Plus</a>. You’ll need your own OpenAI and Pinecone API keys! 🤖
          </p>
          ${authButtonOnCodeGPTPlusProvider}
        </div>
    </div>
  </div>`
    const chat = history.length ? history : initialTemplate

    const slashCommands = [
      {
        name: 'explain',
        description: 'Explain how the selected code works'
      },
      {
        name: 'fix',
        description: 'Propose a fix for the problems in the selected code'
      },
      {
        name: 'tests',
        description: 'Generate unit tests for the selected code'
      },
      {
        name: 'clear',
        description: 'Clear the chat history'
      }
    ]
    return `
      <!doctype html>
        <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
                <link rel="stylesheet" href="${styleVscode}">
                <link rel="stylesheet" href="${styleChat}">
                <link rel="stylesheet" href="${flex}">
                <link rel="stylesheet" href="${styleGithubDark}">
                <script nonce="${nonce}" src="${highlightMinJs}"></script>
                <script nonce="${nonce}" src="${showdownJs}"></script>
                <script nonce="${nonce}" src="${markedMindJs}"></script>
            </head>
            <body class="background: black">
                    <form id="app" class="">  
                        ${authSection}
                    
                        <input type="hidden" name="userName" id="userName" value="${this._userName}">
                        <input type="hidden" name="userPic" id="userPic" value="${this._userProfilePic}">
                        <input type="hidden" name="lastUniqueId" id="lastUniqueId" value="">
                        <div id="agentContainer">
                          <h3 style="align-self: center; margin: 0.5rem">CodeGPT Plus Agents</h3>
                          <div id="agentList">
                           <div>
                            ${agents?.length
                              ? agents?.map(agent => `
                              <label>
                                  <input type="radio" name="agent" value="${agent.id}" ${agent.isSelected ? 'checked' : ''}>
                                  <span>${agent.name.trim()}</span>
                              </label>`).join('')
                              : '<span>No agents available!</span><br><a href="https://account.codegpt.co"> Create your first agent now</a>'
                            }
                            </div>
                          </div>
                          ${logoutSection}
                        </div>
                        <div id="chat_container" class="hljs">
                            ${chat}
                        </div>
                        <button id="stopResponse">Stop responding</button>
                        <footer>
                            <div id="slashCommands">
                                ${slashCommands.map(command => `
                                    <ul>
                                        <li>
                                            <span>/${command.name}</span>
                                            <span>${command.description}</span>
                                        </li>
                                    </ul>
                                `).join('')}
                            </div>
                          <textarea type="text" rows="1" tabindex="0" name="prompt" id="prompt" placeholder="Ask a question..."></textarea>
                          <button type="submit" id="btn-question">Send ${sendButtonSvg}</button>
                        </footer>
                    </form>
                    <script nonce="${nonce}" src="${scriptChat}" >
            </body>
        </html>
      `
  }

  _getNonce () {
    let text = ''
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length))
    }
    return text
  }

  static register (context) {
    const provider = ChatSidebarProvider.getChatInstance(context)
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(
        'codegpt-sidebar',
        provider,
        {
          webviewOptions: {
            retainContextWhenHidden: true
          }
        }
      )
    )
  }
}

ChatSidebarProvider.viewType = 'miExtension.sidebar'

module.exports = ChatSidebarProvider
