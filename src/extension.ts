// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { exec }  from 'child_process';

interface TextOptions {
    wholeDocument?: boolean;     // get entire document up to cursor
    maxChars?: number;          // get last N characters up to cursor
    currentLineOnly?: boolean;   // get only current line up to cursor
}

function getTextUpToCursor(options: TextOptions = { wholeDocument: true }): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return null;
    }

    const document = editor.document;
    const position = editor.selection.active;

    try {
        if (options.currentLineOnly) {
            return document.lineAt(position.line).text.substring(0, position.character);
        }

        // Get the full text up to cursor
        const range = new vscode.Range(
            new vscode.Position(0, 0),
            position
        );
        const text = document.getText(range);

        // If maxChars is specified, take only the last N characters
        if (options.maxChars) {
            return text.slice(-options.maxChars);
        }

        return text;

    } catch (error) {
        vscode.window.showErrorMessage('Error getting text: ' + error);
        return null;
    }
}

function escapeShellText(text: string): string {
     // First replace all backslashes with doubled backslashes
	 let escaped = text.replace(/\\/g, '\\\\');
    
	 // Then escape quotes
	 escaped = escaped.replace(/"/g, '\\"');
	 
	 // Wrap in quotes
	 return `${escaped}`;
}

function executeEvocaitionCommand(returnType: 'text' | 'sentence') {
	// Get configuration
	const config = vscode.workspace.getConfiguration('evocaition');

	// Pull our settings out of it
	const modelId = config.get<string>('modelId');
	const maxTokens = config.get('maxTokens', 0);
	const temp = config.get<number>('temperature', 1.0);
	const topP = config.get<number>('topP', 0.9);
	const minP = config.get<number>('minP', 0.0);
	const topK = config.get<number>('topK', 0);
	const repPen = config.get<number>('repPen', 0);
	const seed = config.get('seed');
	const apiKey = config.get('apiKey');
	const apiEndpoint = config.get('apiEndpoint');

	// grab the configured number of characters from the document for context
	const documentContextSize = config.get<number>('documentContextCharacterLength');
	const documentTail = getTextUpToCursor({ maxChars: documentContextSize });
	const promptStart = 'You are a creative writing specialist AI. Continue the following text:\n\n';
	const prompt = escapeShellText(promptStart + documentTail);

	// Build command
	let cmd = `evocaition --plain --prompt "${prompt}" --model-id "${modelId}" --temp ${temp} --top-k ${topK} --top-p ${topP} --min-p ${minP} --rep-pen ${repPen}`;

	const maxTokensNumber = maxTokens !== null ? Number(maxTokens) : null;
	if (returnType === 'sentence') {
		const sentenceMax = config.get<number>('sentenceMaxTokens', 100);
		const maxTokensSentenceMode = Math.min(sentenceMax, maxTokensNumber || 100);
        cmd += ` --max-tokens ${maxTokensSentenceMode}`;
	} else if (maxTokensNumber !== null && maxTokensNumber !== 0) {
		cmd += ` --max-tokens ${maxTokens}`;
	}
	if (seed !== null) {
		cmd += ` --seed ${seed}`;
	}
	if (apiKey !== null) {
		cmd += `  --key ${apiKey}`;
	}
	if (apiEndpoint !== null) {
		cmd += `  --api "${apiEndpoint}"`;
	}

	console.log('evocation command: ', cmd);

	// actually run the command
	exec(cmd, (error, stdout, stderr) => {
		if (error) {
			vscode.window.showErrorMessage(error.message);
			return;
		}
		
		// Process the output to return only a sentence if needed
		let textToInsert = stdout;
		if (returnType === 'sentence') {
			const sentenceRegex = /^(\s*[^.!?]*[.!?])/;
			const match = stdout.match(sentenceRegex);
			textToInsert = match ? match[0] : stdout.split(/[.!?]/)[0] + ".";
		}
		
		// Insert the text at cursor position
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			editor.edit(editBuilder => {
				editBuilder.insert(editor.selection.active, textToInsert);
			});
		}
  	});
}

function registerConfigSetCommand(
    context: vscode.ExtensionContext,
    configKey: string,
    commandName: string,
    prompt: string
) {
    const disposable = vscode.commands.registerCommand(commandName, async () => {
        const currentValue = vscode.workspace.getConfiguration('evocaition').get(configKey);
        const input = await vscode.window.showInputBox({
            prompt: prompt,
            value: currentValue?.toString() || ''
        });

        if (input !== undefined) {
            vscode.workspace.getConfiguration('evocaition').update(configKey, input, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Updated ${configKey} to ${input}`);
        }
    });

    context.subscriptions.push(disposable);
}

function registerPredictCommand(
    context: vscode.ExtensionContext,
    commandName: string,
    returnType: 'text' | 'sentence'
) {
    const disposable = vscode.commands.registerCommand(commandName, () => {
        executeEvocaitionCommand(returnType);
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// console.log('Extension "evocaition" is now active!');
	registerPredictCommand(context, 'evocaition.predictText', 'text');
    registerPredictCommand(context, 'evocaition.predictSentence', 'sentence');
	
	registerConfigSetCommand(context, 'modelId', 'evocaition.setModelId', 'Enter model ID');
    registerConfigSetCommand(context, 'maxTokens', 'evocaition.setMaxTokens', 'Enter max tokens to predict (0 == automatic)');
    registerConfigSetCommand(context, 'temperature', 'evocaition.setTemperature', 'Enter sampling temperature');
    registerConfigSetCommand(context, 'topP', 'evocaition.setTopP', 'Enter Top-P');
    registerConfigSetCommand(context, 'minP', 'evocaition.setMinP', 'Enter Min-P');
    registerConfigSetCommand(context, 'topK', 'evocaition.setTopK', 'Enter Top-K');
    registerConfigSetCommand(context, 'repPen', 'evocaition.setRepPen', 'Enter repetition penalty');
    registerConfigSetCommand(context, 'apiKey', 'evocaition.setApiKey', 'Enter API key');
	registerConfigSetCommand(context, 'apiEndpoint', 'evocaition.setApiEndpoint', 'Enter API endpoint URL');
}

// This method is called when your extension is deactivated
export function deactivate() {}
