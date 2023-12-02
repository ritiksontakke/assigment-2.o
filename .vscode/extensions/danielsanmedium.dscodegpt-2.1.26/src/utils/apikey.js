const API_KEY = 'API_KEY'
const PROMPT_LAYER_API_KEY = 'PROMPT_LAYER_API_KEY'

const vscode = require('vscode')

async function setApiKey (context, isPromptLayer = false) {
  // Check if context is defined and accessible
  if (!context) {
    vscode.window.showErrorMessage('Error: Context is not available.')
    return
  }

  // Check if context.secrets is defined and accessible
  if (!context.secrets) {
    vscode.window.showErrorMessage('Error: Secrets are not available.')
    return
  }

  // We show a dialog box to the user to enter the Key
  const apiKey = await vscode.window.showInputBox({
    title: 'Enter your API KEY',
    password: true,
    placeHolder: '**************************************',
    ignoreFocusOut: true
  })

  // If the user canceled the dialog
  if (!apiKey) {
    vscode.window.showWarningMessage('Empty value')
    return
  }

  const provider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')

  const apiKeyS = isPromptLayer ? PROMPT_LAYER_API_KEY : API_KEY + '_' + provider

  // Storing a secret
  await context.secrets.store(apiKeyS, apiKey)

  // Mostramos un mensaje al usuario para confirmar que la token se ha guardado de forma segura
  // vscode.window.showInformationMessage('API KEY saved. Please Reload Window to apply changes.', 'Reload').then((selection) => {
  //   if (selection === 'Reload') {
  //     vscode.commands.executeCommand('workbench.action.reloadWindow')
  //   }
  // })
}

async function removeApiKey (context) {
  const provider = vscode.workspace.getConfiguration().get('CodeGPT.apiKey')
  await context.secrets.delete(API_KEY + '_' + provider)
}

module.exports = { setApiKey, removeApiKey }
