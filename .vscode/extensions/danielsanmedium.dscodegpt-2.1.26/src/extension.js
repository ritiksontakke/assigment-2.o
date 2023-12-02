const vscode = require('vscode')
const webview = require('./utils/webview.js')
const language = require('./utils/language.js')
const prompts = require('./utils/prompts.js')
const stackoverflow = require('./utils/stackoverflow.js')
const stackOverflowWebview = require('./utils/stackoverflow_webview.js')
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
const apis = require('./utils/apis.js')
const { setApiKey, removeApiKey } = require('./utils/apikey.js')
const { DEFAULT_MODEL_BY_PROVIDER } = require('./consts.js')
const { ACTION_TYPES } = require('./enums.js')
const ChatSidebarProvider = require('./ChatSidebarProvider')
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const fs = require('fs')
const { v4: uuidv4 } = require('uuid')
const { sendEvent } = require('./utils/telemetry.js')

/* GLOBAL VARs */

// OpenAI - Cohere API Key
const API_KEY = 'API_KEY'
const PROMPT_LAYER_API_KEY = 'PROMPT_LAYER_API_KEY'

// StackOverflow Vars
let soURL = ''
let soTitle = ''
let soPost = ''
let soPostHTML = ''
let soAnswer = ''
let soAnswerHTML = ''
let soScore = ''

let provider = getConfig({ config: 'CodeGPT.apiKey' })
let defaultModel = DEFAULT_MODEL_BY_PROVIDER[provider] || ''

let model = getConfig({ config: 'CodeGPT.model', defaultValue: defaultModel })
let temperature = getConfig({ config: 'CodeGPT.temperature', defaultValue: 0.3 })
let maxTokens = getConfig({ config: 'CodeGPT.maxTokens', defaultValue: 500 })
let lang = getConfig({ config: 'CodeGPT.query.language' })

function getConfig ({ config, defaultValue = '' }) {
  return vscode.workspace.getConfiguration().get(config) || defaultValue
}

function updateIsJudiniSelected () {
  const config = vscode.workspace.getConfiguration('CodeGPT')
  const apiKey = config.get('apiKey')
  vscode.commands.executeCommand(
    'setContext',
    'isJudiniSelected',
    apiKey === 'CodeGPT Plus'
  )
}

function reloadChatView () {
  const chatSidebarProvider = ChatSidebarProvider.getChatInstance()
  chatSidebarProvider.clearChat()
}

// Llama a esta función cuando tu extensión se active
updateIsJudiniSelected()

// Escucha cambios en la configuración y actualiza isJudiniSelected si es necesario
vscode.workspace.onDidChangeConfiguration((event) => {
  if (event.affectsConfiguration('CodeGPT.apiKey')) {
    updateIsJudiniSelected()
    const lastProvider = provider
    provider = getConfig({ config: 'CodeGPT.apiKey' })
    if (lastProvider === 'CodeGPT Plus' || provider === 'CodeGPT Plus') {
      reloadChatView()
    }
  }
  defaultModel = DEFAULT_MODEL_BY_PROVIDER[provider] || ''

  if (event.affectsConfiguration('CodeGPT.model')) {
    model = getConfig({ config: 'CodeGPT.model', defaultValue: defaultModel })
  }
  if (event.affectsConfiguration('CodeGPT.temperature')) {
    temperature = getConfig({ config: 'CodeGPT.temperature', defaultValue: 0.3 })
  }
  if (event.affectsConfiguration('CodeGPT.maxTokens')) {
    maxTokens = getConfig({ config: 'CodeGPT.maxTokens', defaultValue: 500 })
  }
  if (event.affectsConfiguration('CodeGPT.query.language')) {
    lang = getConfig({ config: 'CodeGPT.query.language' })
  }
})

function createNotebook (responseText) {
  // separete markdown and code from responseText
  // reemplaza los ```python y ``` por un valor vacio
  try {
    const regex = /```python([\s\S]*?)```/g
    const matches = responseText.match(regex)
    const codigoPython = matches.map(match => match.replace(/```python|```/g, '').trim())
    // reemplaza los el valor de la variable codigoPython por un valor vacio
    const markdown = responseText.replace(/```python([\s\S]*)```/, '')
    const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath
    const folderName = 'notebooks'
    if (!fs.existsSync(`${workspaceFolder}/${folderName}`)) {
      fs.mkdirSync(`${workspaceFolder}/${folderName}`)
    }
    // obtén el nombre del archivo actual sin la extesión
    const currentFileName = vscode.window.activeTextEditor.document.fileName.split('/').pop().split('.')[0]

    // crea un nombre de archivo "_" mas el día, mes y año actual separado por guiones
    const fileName = currentFileName + '_' + new Date().toLocaleDateString().replace(/\//g, '-')
    const filePath = `${workspaceFolder}/${folderName}` + '/' + fileName + '.ipynb'
    // Contenido del archivo .ipynb
    const notebookContent = {
      cells: [
        {
          cell_type: 'markdown',
          metadata: {},
          source: [
            markdown
          ]
        },
        {
          cell_type: 'code',
          execution_count: null,
          metadata: {},
          outputs: [],
          source: [
            codigoPython
          ]
        }
      ],
      metadata: {
        kernelspec: {
          display_name: 'Python 3',
          language: 'python',
          name: 'python3'
        },
        language_info: {
          codemirror_mode: {
            name: 'ipython',
            version: 3
          },
          file_extension: '.py',
          mimetype: 'text/x-python',
          name: 'python',
          nbconvert_exporter: 'python',
          pygments_lexer: 'ipython3',
          version: '3.10'
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    }
    // // Guardar el archivo .ipynb
    fs.writeFileSync(filePath, JSON.stringify(notebookContent, null, 2))
    // // Abrir el archivo .ipynb en VSCode
    vscode.workspace.openNotebookDocument(vscode.Uri.file(filePath)).then(async document => {
      vscode.window.showNotebookDocument(document)
      const cells = document.getCells()
      // recorre cada celda del notebook y ejecuta el codigo
      for (const cell of cells) {
        try {
          const saved = await cell.document.save()
          console.log(saved)
          const executed = await vscode.commands.executeCommand('notebook.cell.execute', { cell })
          console.log(executed)
          // Espera un momento para permitir que se complete la ejecución
          await new Promise(resolve => setTimeout(resolve, 2000))
          const outputs = cell.outputs.map(output => output.text).join('\n')
          console.log(outputs)
          // vscode.window.showWarningMessage(outputs)
        } catch (error) {
          vscode.window.showWarningMessage(error)
        }
      }
    })
  } catch (error) {
    vscode.window.showWarningMessage('Error')
  }
}

async function getOpenAI (cleanPromptText, promptType, context) {
  provider = getConfig({ config: 'CodeGPT.apiKey' })
  defaultModel = DEFAULT_MODEL_BY_PROVIDER[provider] || ''

  model = getConfig({ config: 'CodeGPT.model', defaultValue: defaultModel })
  temperature = getConfig({ config: 'CodeGPT.temperature', defaultValue: 0.3 })
  maxTokens = getConfig({ config: 'CodeGPT.maxTokens', defaultValue: 500 })
  const promptLayerApiKey = await context.secrets.get('PROMPT_LAYER_API_KEY')
  lang = getConfig({ config: 'CodeGPT.query.language' })

  const agents = this._context.globalState.get('agents') || []
  const selectedAgents = agents.filter(agent => agent.isSelected)

  let azureLink, azureApi
  if (provider === 'Azure') {
    azureLink = await context.secrets.get('AZURE_LINK')
    azureApi = await context.secrets.get('AZURE_API_KEY')
  }

  const apiKeyFirstTime = await context.globalState.get('apiKeyFirstTime')
  if (apiKeyFirstTime !== 'true') {
    const oldApiKey = await context.secrets.get(API_KEY)
    const apiKey = await context.secrets.get(API_KEY + '_' + provider)
    if (oldApiKey && !apiKey) {
      await context.secrets.store(API_KEY + '_' + provider, oldApiKey)
    }
    await context.secrets.delete(API_KEY)
    await context.globalState.update('apiKeyFirstTime', 'true')
  }
  const apiKey = await context.secrets.get(API_KEY + '_' + provider)
  const judiniApi = await context.secrets.get('judiniApiKey')
  if (!apiKey && !['Azure', 'Ollama', 'GPT4All'].includes(provider)) {
    vscode.window.showWarningMessage('Enter your ' + provider + ' API Key with the Set API Key command')
    return 'Please enter your api key, go to https://codegpt.co for more information.'
  }

  const codeGPTVersion = context.extension.packageJSON.version
  let codeGPTUserId = context.globalState.get('uuid') ?? context.globalState.get('codeGPTUserId')
  if (!codeGPTUserId) {
    codeGPTUserId = uuidv4()
    context.globalState.update('codeGPTUserId', codeGPTUserId)
    const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')
    sendEvent('userCreated', {
      userType: 'anonymous',
      language,
      codeGPTVersion
    }, codeGPTUserId)
  }

  const mixPanelData = {
    userType: context.globalState.get('uuid') ? 'registered' : 'anonymous',
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
    sendEvent('jupyterNotebook', fullData, codeGPTUserId)
  }

  // One Shot
  const oneShotPrompt = prompts.getCommandPrompt(cleanPromptText, promptType, lang)

  // Progress Location init
  const progressOptions = {
    location: vscode.ProgressLocation.Notification,
    title: 'CodeGPT',
    cancellable: true
  }

  let response

  await vscode.window.withProgress(progressOptions, async (progress, token) => {
    // if the progress is canceled
    if (token.isCancellationRequested) return

    // Update the progress bar
    progress.report({ message: 'I am thinking...' })
    const uniqueId = ''
    const stop = false
    try {
      const chatMessages = [{
        role: 'user',
        content: oneShotPrompt
      }]

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

        response = await openAIClient.createChatCompletion({
          apiKey,
          model,
          chatMessages,
          text: oneShotPrompt
        })
      } else {
        const message = 'You are an artificial intelligence assistant expert in programming. You are helping a programmer to solve a problem. Write any code like this format:' +
          '```python\n def sum(b):\n c = a + b\nreturn c ```\n' +
          'User:  ' + oneShotPrompt +
          'AI Assistant: '
        const lastMessage = ''

        if (provider === 'OpenAI') {
          response = await openAIClient.createOpenAiCompletion(apiKey, model, oneShotPrompt, temperature, maxTokens)
        } else if (provider === 'Cohere') {
          response = await cohereClient.createCohereCompletion(apiKey, model, oneShotPrompt, temperature, maxTokens)
        } else if (provider === 'AI21') {
          response = await aiClient.createAICompletion({
            apiKey,
            model,
            oneShotPrompt,
            temperature,
            maxTokens,
            lastMessage
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
            progress.report({ message: 'I am thinking...' })
            response = await huggingfaceClient.createChatCompletion({
              text: message,
              apiKey,
              model,
              lastMessage,
              temperature,
              maxTokens,
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
          response = await ollamaClient.createChatCompletion({
            text: message,
            model,
            lastMessage,
            uniqueId,
            stopTriggered: stop,
            sendEventWithStatusCode
          })
        } else if (provider === 'CodeGPT Plus') {
          response = await judiniClient.createChatCompletion({
            text: message,
            chatMessages,
            lastMessage,
            apiKey: judiniApi,
            uniqueId,
            stopTriggered: stop
          })
        } else if (provider === 'Anthropic') {
          response = await anthropicClient.createChatCompletion({
            apiKey,
            model,
            text: message,
            lastMessage,
            maxTokens,
            temperature,
            uniqueId,
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
            progress.report({ message: 'I am thinking...' })
            response = await googleClient.createChatCompletion({
              text: message,
              apiKey,
              model,
              lastMessage,
              temperature,
              maxTokens,
              uniqueId
            })

            if (model === 'text-bison-001') {
              response = await googleClient.createCompletion({
                text: message,
                apiKey,
                model,
                lastMessage,
                temperature,
                maxTokens,
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
          response = await azureOpenAIClient.createChatCompletion({
            link: azureLink,
            apiKey: azureApi,
            text: message,
            lastMessage,
            uniqueId,
            maxTokens,
            stopTriggered: stop,
            promptLayerApiKey,
            sendEventWithStatusCode
          })
        } else {
          if (!response) {
            response = `${provider} API could not process the query`
          }
        }
      }
      if (!response) {
        response = `${provider} API could not process the query, try selecting the code and using Ask CodeGPT to write your own query`
      }
    } catch (error) {
      response = `${provider} API Response was: ${error}`
      vscode.window.showErrorMessage(response)
    }

    progress.report({ increment: 100, message: '' })
  }).then(undefined, err => {
    response = 'Error: ' + err
  })

  return response
}

// asynchronous function to send the query to the provider
async function getCodeGPTOutput (text, type, context, languageId, dataFile, notebook = false) {
  const chat = false
  let copy = false
  let title = ''
  let typing = false

  // limpiamos el texto que ingresó el usuario
  const cleanPromptText = text.split('\r\n').join('\n')
  let responseText = ''
  try {
    responseText = await getOpenAI(cleanPromptText, type, context)
  } catch (error) {
    console.log(error)
  }

  if (type === ACTION_TYPES.ASK_STACK_OVERFLOW) {
    const soArray = [soURL, soTitle, soPost, soPostHTML, soAnswer, soAnswerHTML, soScore]
    ShowStackOverflowPanel(type, soArray, responseText, context)
    return
  }

  if (type === ACTION_TYPES.EXPLAIN_CODE) {
    title = 'Explain Code GPT:'
    copy = true
    typing = false
    webview.createWebViewPanel(type, responseText, context, chat, copy, title, typing, dataFile, languageId)
    return
  }

  if (type === ACTION_TYPES.DOCUMENT_CODE) {
    title = 'Document Code GPT:'
    copy = true
    typing = false
    webview.createWebViewPanel(type, responseText, context, chat, copy, title, typing, dataFile, languageId)
    return
  }

  if (type === ACTION_TYPES.FIND_PROBLEMS) {
    title = 'Find Problems Code GPT:'
    copy = true
    typing = false
    webview.createWebViewPanel(type, responseText, context, chat, copy, title, typing, dataFile, languageId)
    return
  }

  if (type === ACTION_TYPES.SEARCH_APIS) {
    title = 'Search APIs Code GPT:'
    copy = true
    typing = false
    webview.createWebViewPanel(type, responseText, context, chat, copy, title, typing, dataFile, languageId)
    return
  }

  if (notebook) {
    createNotebook(responseText)
    return
  }

  const outputDocument = await vscode.workspace.openTextDocument({
    content: 'Loading...',
    language: 'markdown'
  })

  const outputDocumentEditor = await vscode.window.showTextDocument(
    outputDocument,
    {
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true,
      preview: true
    }
  )

  if (languageId != null) {
    vscode.languages.setTextDocumentLanguage(outputDocument, languageId)
  }

  // la cargamos en el editor
  outputDocumentEditor.edit(editBuilder => {
    editBuilder.replace(
      new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(99999999999999, 0)
      ),
      `${responseText}`
    )
  })
}

// Init Webview
async function ShowStackOverflowPanel (type, soArray, response, context) {
  // Set the HTML and JavaScript content of the WebView
  stackOverflowWebview.createWebViewPanel(type, soArray, response, context)
}

/**
 * @param {vscode.ExtensionContext} context
 */
async function activate (context) {
  // sidebar
  const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'codegpt-sidebar',
      chatSidebarProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  )

  /*   setTimeout(() => { // https://github.com/davila7/code-gpt-docs/issues/95 TODO: initialize chatSidebarProvider on startup without opening the chat
    // check if the chat is already initialized
    if (!chatSidebarProvider.view) {
      openChatView()
      closeChatView()
    }
  }, 3000) */

  const setApiKeyCodeGPT = vscode.commands.registerCommand('codegpt.setApiKeyCodeGPT', async () => {
    await setApiKey(context)
  })

  const removeApiKeyCodeGPT = vscode.commands.registerCommand('codegpt.removeApiKeyCodeGPT', async () => {
    await removeApiKey(context)
  })
  const setPromptLayerApiKeyCodeGPT = vscode.commands.registerCommand('codegpt.setPromptLayerApiKey', async () => {
    await setApiKey(
      context,
      true
    )
  })

  const removePromptLayerApiKeyCodeGPT = vscode.commands.registerCommand('codegpt.removePromptLayerApiKey', async () => {
    await context.secrets.delete(PROMPT_LAYER_API_KEY)
    vscode.window.showWarningMessage('Your Prompt Layer API KEY was removed')
  })

  const getCode = vscode.commands.registerCommand('codegpt.getCode', async () => {
    const editor = vscode.window.activeTextEditor
    const { document } = editor
    let { languageId } = document

    // terraform exeption
    if (languageId === 'tf') {
      languageId = 'terraform'
    }
    let notebook = false
    if (languageId === 'python') {
      notebook = true
    }

    const cursorPosition = editor.selection.active
    const selection = new vscode.Selection(cursorPosition.line, 0, cursorPosition.line, cursorPosition.character)
    const comment = document.getText(selection)
    const commentCharacter = language.detectLanguage(languageId)
    const oneShotPrompt = languageId
    const errorMessageCursor = 'Create a comment and leave the cursor at the end of the comment line'
    if (comment === '') {
      vscode.window.showErrorMessage(
        errorMessageCursor
      )
      return
    }
    // el caracter existe
    const existsComment = comment.includes(commentCharacter)
    if (!existsComment) {
      vscode.window.showErrorMessage(errorMessageCursor)
      return
    }

    if (commentCharacter === false) {
      vscode.window.showErrorMessage('This language is not supported')
      return
    }
    const finalComment = comment.replaceAll(commentCharacter, oneShotPrompt + ': ')
    if (notebook) {
      getCodeGPTOutput(finalComment, 'getCodeGPT', context, languageId, [], notebook)
    } else {
      startCodeGPTCommand('getCodeGPT')
    }
  })

  const askStackOverflow = vscode.commands.registerCommand('codegpt.askStackOverflow', async () => {
    // validate to have an editor tab open
    if (vscode.window.activeTextEditor === undefined) {
      vscode.window.showWarningMessage(
        'To get started, you must first have an editor tab open'
      )
      return
    }

    const text = await vscode.window.showInputBox({
      title: 'Ask StackOverflow',
      prompt: 'Enter a question',
      placeHolder: 'Question...'
    })
    if (text) {
      const questions = await stackoverflow.getStackOverflowQuestions(text)

      if (questions == null) {
        vscode.window.showWarningMessage(
          'No questions related to this topic were found on StackOverflow, please try again in a different way.'
        )
        return
      }

      const options = await vscode.window.showQuickPick(questions, {
        matchOnDetail: true
      })

      // nothing selected
      if (options === undefined) {
        return
      }

      const result = await stackoverflow.getStackOverflowResult(options.link)
      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')
      const finalText = 'This is a StackOverflow question:""" ' + result[2] + ' """. Now you write a respond in ' + language + ' like a programming expert: ';

      // r = [url, title, post, post_html, answer, answer_html, score]
      [soURL, soTitle, soPost, soPostHTML, soAnswer, soAnswerHTML, soScore] = result

      getCodeGPTOutput(finalText, 'askStackOverflow', context, null, [])
    } else {
      vscode.window.showErrorMessage('Empty text!')
    }
  })

  const searchApisCodeGPT = vscode.commands.registerCommand('codegpt.searchApisCodeGPT', async () => {
    // validate to have an editor tab open
    if (vscode.window.activeTextEditor === undefined) {
      vscode.window.showWarningMessage(
        'To get started, you must first have an editor tab open'
      )
      return
    }

    const languageId = vscode.window.activeTextEditor.document.languageId

    const text = await vscode.window.showInputBox({
      title: 'Search APIs Code GPT',
      prompt: "Find an API you'd like to work with",
      placeHolder: ''
    })

    if (text) {
      const apiResult = await apis.getAPIs(text)

      if (apiResult.length === 0) {
        vscode.window.showWarningMessage('No API found')
        return
      }

      const options = await vscode.window.showQuickPick(apiResult, {
        matchOnDetail: true
      })

      // nothing selected
      if (options === undefined) {
        return
      }

      const language = vscode.workspace.getConfiguration().get('CodeGPT.query.language')

      const finalText = `Act like a programming expert and write in ${language} a short description about "${options.label} ${options.link} ${options.detail}" with an code example in ${languageId}. Use this format:
        Documentation: ${options.link}
        Description:
        Example:
        `

      getCodeGPTOutput(finalText, 'searchApisCodeGPT', context, languageId, [])
    } else {
      vscode.window.showErrorMessage(
        'Empty text!'
      )
    }
  })

  const askCodeGPT = vscode.commands.registerCommand('codegpt.askCodeGPT', async () => {
    openChatView()
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.view.webview.postMessage({
      type: 'focusOnInput',
      ok: true
    })
    vscode.window.showInformationMessage('CodeGPT Chat: Write your question in the chat.')
  })

  const startCodeGPTCommand = (type) => {
    const selection = vscode.window.activeTextEditor.selection
    let selectedText = vscode.window.activeTextEditor.document.getText(selection)
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)

    if (type === 'getCodeGPT') {
      const editor = vscode.window.activeTextEditor
      const { document } = editor
      const { languageId } = document

      const cursorPosition = editor.selection.active
      const selection = new vscode.Selection(cursorPosition.line, 0, cursorPosition.line, cursorPosition.character)
      const comment = document.getText(selection)
      const commentCharacter = language.detectLanguage(languageId)
      const oneShotPrompt = languageId
      const errorMessageCursor = 'Create a comment and leave the cursor at the end of the comment line'
      if (comment === '') {
        vscode.window.showErrorMessage(
          errorMessageCursor
        )
        return
      }
      // el caracter existe
      const existsComment = comment.includes(commentCharacter)
      if (!existsComment) {
        vscode.window.showErrorMessage(errorMessageCursor)
        return
      }

      const finalComment = comment.replaceAll(commentCharacter, oneShotPrompt + ': ')
      selectedText = finalComment
    }

    if (selectedText === '') {
      vscode.window.showErrorMessage(
        'No text selected!'
      )
    } else {
      if (!chatSidebarProvider.view) {
        openChatView()
        setTimeout(() => {
          chatSidebarProvider.view.webview.postMessage({
            type,
            ok: true,
            selectedText
          })
        }, 1000)
      } else {
        chatSidebarProvider.view.webview.postMessage({
          type,
          ok: true,
          selectedText
        })
      }
    }
  }

  const commandExplainCodeGPT = vscode.commands.registerCommand('codegpt.explainCodeGPT', async () => {
    startCodeGPTCommand('explainCodeGPT')
  })

  const commandRefactorCodeGPT = vscode.commands.registerCommand('codegpt.refactorCodeGPT', async () => {
    startCodeGPTCommand('refactorCodeGPT')
  })

  const commandDocumentCodeGPT = vscode.commands.registerCommand('codegpt.documentCodeGPT', async () => {
    startCodeGPTCommand('documentCodeGPT')
  })

  const commandFindProblemsCodeGPT = vscode.commands.registerCommand('codegpt.findProblemsCodeGPT', async () => {
    startCodeGPTCommand('findProblemsCodeGPT')
  })

  const commandUnitTestCodeGPT = vscode.commands.registerCommand('codegpt.unitTestCodeGPT', async () => {
    startCodeGPTCommand('unitTestCodeGPT')
  })

  const getWorkspaceFolder = () => {
    const { workspaceFolders } = vscode.workspace
    return workspaceFolders ? workspaceFolders[0].uri.fsPath : ''
  }

  const commitCodeGPT = vscode.commands.registerCommand('codegpt.commitCodeGPT', async () => {
    const { stdout } = await exec('git diff', { cwd: getWorkspaceFolder() })
    const cleanStdout = stdout.replace(/\n/g, '').replace(/ {2}/g, '').replace(/\s+/g, ' ')
    // console.log({ cleanStdout })
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    openChatView()
    chatSidebarProvider.view.webview.postMessage({
      type: 'commitCodeGPT',
      ok: true,
      gitDiff: cleanStdout
    })
  })

  const commandClearChatCodeGPT = vscode.commands.registerCommand('codegpt.clearChatCodeGPT', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    // console.log(chatSidebarProvider)
    try {
      chatSidebarProvider.clearChat()
    } catch (error) {
      console.error(`Error: ${error.message}`)
    }
  })

  const agentCodeGPT = vscode.commands.registerCommand('codegpt.agentCodeGPT', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.view.webview.postMessage({
      type: 'updateAgentCodeGPT',
      ok: true
    })
  })

  const commandChangelogCodeGPT = vscode.commands.registerCommand('codegpt.changelogCodeGPT', async () => {
    // show README.md
    const axios = require('axios')
    const fs = require('node:fs')
    const path = require('node:path')
    const os = require('node:os')

    try {
      const response = await axios.get(
        'https://raw.githubusercontent.com/davila7/code-gpt-docs/main/README.md'
      )

      const tempFilePath =
        path.join(os.tmpdir(), 'codegpt-README.md')
      fs.writeFileSync(tempFilePath, response.data)

      vscode.commands.executeCommand(
        'markdown.showPreview',
        vscode.Uri.file(tempFilePath)
      )
    } catch (error) {
      console.error(`Error: ${error.message}`)
    }
  })

  const commandOpenSettingsCodeGPT = vscode.commands.registerCommand('codegpt.openSettingsCodeGPT', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.view.webview.postMessage({
      type: 'openSettings'
    })
  })

  const commandLogoutGithub = vscode.commands.registerCommand('codegpt.logoutGithub', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.logoutgithub()
  })

  const commandLoginGithub = vscode.commands.registerCommand('codegpt.loginGithub', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.logingithub()
  })

  const runJupyterNotebook = vscode.commands.registerCommand('codegpt.runJupyterNotebook', async () => {
    const editor = vscode.window.activeTextEditor
    const selection = vscode.window.activeTextEditor.selection
    const selectedText = vscode.window.activeTextEditor.document.getText(selection)

    const { document } = editor
    const { languageId } = document

    if (languageId !== 'python') {
      vscode.window.showErrorMessage('This language is not supported, Code Interpreter only runs on top of the Python language at the moment')
      return
    }

    getCodeGPTOutput(selectedText, 'getCodeGPT', context, languageId, [], true)
  })

  const setAzureDataCodeGPT = vscode.commands.registerCommand('codegpt.setAzureDataCodeGPT', async () => {
    const link = await vscode.window.showInputBox({
      title: 'Enter your Azure link',
      password: false,
      placeHolder: 'https://****.openai.azure.com/deployments/****',
      ignoreFocusOut: true
    })

    // If the user canceled the dialog
    if (!link) {
      vscode.window.showWarningMessage('Empty value')
      return
    }

    // Storing a secret
    await context.secrets.store('AZURE_LINK', link)

    const apiKey = await vscode.window.showInputBox({
      title: 'Enter your Azure API KEY',
      password: true,
      placeHolder: '*********************************',
      ignoreFocusOut: true
    })

    // If the user canceled the dialog
    if (!apiKey) {
      vscode.window.showWarningMessage('Empty value')
      return
    }

    // Storing a secret
    await context.secrets.store('AZURE_API_KEY', apiKey)

    // Mostramos un mensaje al usuario para confirmar que la token se ha guardado de forma segura
    vscode.window.showInformationMessage('Please Reload Window to apply changes.', 'Reload').then((selection) => {
      if (selection === 'Reload') {
        vscode.commands.executeCommand('workbench.action.reloadWindow')
      }
    })
  })

  const forceLogOutCodeGPTPlus = vscode.commands.registerCommand('codegpt.forceLogOutCodeGPTPlus', async () => {
    const chatSidebarProvider = ChatSidebarProvider.getChatInstance(context)
    chatSidebarProvider.forceLogOutCodeGPTPlus()
  })

  // subscribed events
  context.subscriptions.push(
    askCodeGPT,
    commandExplainCodeGPT,
    commandRefactorCodeGPT,
    commandDocumentCodeGPT,
    commandFindProblemsCodeGPT,
    getCode,
    setApiKeyCodeGPT,
    removeApiKeyCodeGPT,
    commandUnitTestCodeGPT,
    askStackOverflow,
    searchApisCodeGPT,
    commandClearChatCodeGPT,
    commandChangelogCodeGPT,
    commitCodeGPT,
    setPromptLayerApiKeyCodeGPT,
    removePromptLayerApiKeyCodeGPT,
    agentCodeGPT,
    commandOpenSettingsCodeGPT,
    commandLogoutGithub,
    commandLoginGithub,
    setAzureDataCodeGPT,
    runJupyterNotebook,
    forceLogOutCodeGPTPlus
  )
}

function openChatView () {
  vscode.commands.executeCommand('workbench.view.extension.codegpt-sidebar-view')
}

/* function closeChatView () {
  vscode.commands.executeCommand('workbench.action.closeSidebar')
} */

// This method is called when your extension is deactivated
function deactivate () { }

module.exports = {
  activate,
  deactivate
}
