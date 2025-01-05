// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as nunjucks from 'nunjucks';
import { exec }  from 'child_process';

interface TextOptions {
    wholeDocument?: boolean;     // get entire document up to cursor
    maxChars?: number;          // get last N characters up to cursor
    currentLineOnly?: boolean;   // get only current line up to cursor
}

function getTextUpToCursor(maxChars: number): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return null;
    }

    const document = editor.document;
    const position = editor.selection.active;

    try {
        // Get the full text up to cursor
        const range = new vscode.Range(
            new vscode.Position(0, 0),
            position
        );
        const text = document.getText(range);
		return text.slice(-maxChars);
    } catch (error) {
        vscode.window.showErrorMessage('Error getting text: ' + error);
        return null;
    }
}

function getTextAfterCursor(maxChars: number): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No active text editor');
        return null;
    }

    const document = editor.document;
    const position = editor.selection.active;

    try {
        // Get the full text after cursor
        const range = new vscode.Range(
            position,
            new vscode.Position(document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length)
        );
        const text = document.getText(range);
		return text.slice(0, maxChars);
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
	const maxTokens = config.get('maxTokens');
	const temp = config.get<number>('temperature');
	const topP = config.get<number>('topP');
	const minP = config.get<number>('minP');
	const topK = config.get<number>('topK');
	const repPen = config.get<number>('repPen');
	const seed = config.get('seed');
	const apiKey = config.get('apiKey');
	const apiEndpoint = config.get('apiEndpoint');

	// grab the configured number of characters from the document for context
	const documentContextSize = config.get<number>('documentContextCharacterLength') ?? 3000;
	const documentBodyBefore = getTextUpToCursor(documentContextSize);
	
	const promptTemplate = config.get<string>('promptTemplate') ??
		`You are a creative writing specialist AI. Continue the following text:\n\n{{ documentBefore }}`;
		
	const promptData = { 
		documentBefore: documentBodyBefore,
	};
	const prompt = escapeShellText(nunjucks.renderString(promptTemplate, promptData));

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
		cmd += ` --key "${apiKey}"`;
	}
	if (apiEndpoint !== null && apiEndpoint !== '') {
		cmd += ` --api "${apiEndpoint}"`;
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
        const config = vscode.workspace.getConfiguration('evocaition');
        const currentValue = config.get(configKey);
        const input = await vscode.window.showInputBox({
            prompt: prompt,
            value: currentValue?.toString() || ''
        });

		// make sure that we end up writing the input value out as a specific type
		// so that everything is not just a 'string' ...
		if (input !== undefined) {
            let valueToSet: any = input;
            const configType = config.inspect(configKey)?.defaultValue?.constructor.name;

            if (configType === 'Number') {
                const parsedNumber = parseFloat(input);
                if (!isNaN(parsedNumber)) {
                    valueToSet = parsedNumber;
                } else {
                    vscode.window.showErrorMessage(`Invalid number: ${input}`);
                    return;
                }
            } else if (configType === 'Boolean') {
                const parsedBoolean = input.toLowerCase();
                if (parsedBoolean === 'true') {
                    valueToSet = true;
                } else if (parsedBoolean === 'false') {
                    valueToSet = false;
                } else {
                    vscode.window.showErrorMessage(`Invalid boolean: ${input}`);
                    return;
                }
            }

            config.update(configKey, valueToSet, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(`Updated ${configKey} to ${valueToSet}`);
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
