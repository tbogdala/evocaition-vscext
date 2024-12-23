# evocaition-vscext 

This is the source code for the Visual Studio Code extension named `evocaition`,
which gives the editor the ability to invoke the `evocaition` command-line tool
to generate text using the content from the current editor window.

## Features

* **_Seamless AI Integration_**: Connect to **Cloud APIs** (e.g., [OpenRouter](https://openrouter.ai/)) 
or  utilize **Local AI** solutions (e.g., [LM Studio](https://lmstudio.ai/docs/api/server)) 
for text generation.
* **_Customizable Experience_**: Tailor your text prediction with **Configurable Sampler Settings**.
* **

The extension supports the same features that the [evocaition](https://github.com/tbogdala/evocaition) 
command-line application supports, such as:

* **Cloud API Integration**: Use any OpenAI compatible endpoint, such as
    , to generate text with AI.
* **Local AI Integration**: Instead of a cloud provider, use an application like
     to run a local server process.
* **Configurable Sampler Settings**: Set values such as `tempature`, `topK`,
    `topP`, `minP` in the VS Code configuration JSON file to control prediction.


## Requirements

An installed binary for [evocaition](https://github.com/tbogdala/evocaition) must
already be installed somewhere accessible by your PATH environment.


## Usage

Make sure to set the API key first, if needed. This can be done through the
`Evocation: Set API Key` command.

### Running Text Prediction

The default keybinding for text prediction is `ctrl+k, p` or `cmd+k, p` on MacOS.
This will run the `evocaition` app in the background using the sampler settings 
pulled from the configuration file to control the LLM text prediction. Once the
task is complete, the text will be inserted at the cursor's location in the
active window.

Another mode offered is bound to `ctrl+k, ctrl+p` or `cmd+k, cmd+p` on MacOS which
will attempt to predict only **one sentence**. Even if more tokens are predicted,
only the completion of the sentence will get inserted.

### Setting Configuration Values

To set configuration values, you can use the commands available in the Command Palette:

1) Open the Command Palette (Ctrl+Shift+P or Cmd+Shift+P on macOS).
2) Type the command you want to run (e.g., `Evocaition: Set API Key`) and press Enter.
3) Follow the prompt to enter the desired value.

Alternatively, you can directly edit the User Settings (JSON) file:

1) Run the command Preferences: Open User Settings (JSON) (Cmd+, on macOS).
2) Add the appropriate key-value pairs for extension as documented below.


## Configuration


### API Settings

* **`evocaition.apiKey`**: (string) If using a cloud API like [openrouter](https://openrouter.ai), set your API key here.
	+ Example: `"evocaition.apiKey": "<LONG API KEY TEXT>"`
* **`evocaition.apiEndpoint`**: (string) Defaults to openrouter. Set a different API endpoint if needed (e.g., for local AI integration).
	+ Example: `"evocaition.apiEndpoint": "http://127.0.0.1:1234"`

### Model and Generation Settings

* **`evocaition.modelId`**: (string) The ID of the model to use for text generation.
	+ Example: `"evocaition.modelId": "mygetModelID"`
* **`evocaition.maxTokens`**: (integer) The maximum number of tokens to generate.
	+ Default: `0` (no limit)
	+ Example: `"evocaition.maxTokens": 512`
* **`evocaition.sentenceMaxTokens`**: (integer) The maximum number of tokens to generate in 'sentence' mode.
	+ Default: `100`
	+ Example: `"evocaition.sentenceMaxTokens": 50`
* **`evocaition.temperature`**: (number) The temperature setting for the model (controls randomness).
	+ Default: `1.0`
	+ Example: `"evocaition.temperature": 0.7`

### Sampler Settings

* **`evocaition.topP`**: (number) The top P value for nucleus sampling.
	+ Default: `0.9`
	+ Example: `"evocaition.topP": 0.8`
* **`evocaition.minP`**: (number) The minimum P value for nucleus sampling.
	+ Default: `0.0`
	+ Example: `"evocaition.minP": 0.05`
* **`evocaition.topK`**: (integer) The top K value for sampling.
	+ Default: `0`
	+ Example: `"evocaition.topK": 50`
* **`evocaition.repPen`**: (number) The repetition penalty for the model.
	+ Default: `0`
	+ Example: `"evocaition.repPen": 1.04`

### Additional Settings

* **`evocaition.seed`**: (integer) An optional seed value for reproducibility.
	+ Example: `"evocaition.seed": 42`
	+ **Note:** Not currently configurable via a specific command; set directly in User Settings JSON.
* **`evocaition.documentContextCharacterLength`** (integer) An optional number of characters to 
	pull from the active document to send to the AI as part of the prompt.
	+ Default: 3000
	+ Example: `"evocaition.documentContextCharacterLength": 10240`


## Installation

You can install the `evocaition-vscext` extension via the Visual Studio Code Marketplace:
1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the square icon on the Sidebar or pressing `Ctrl+Shift+X`.
3. In the search bar, type `evocaition`.
4. Click on the extension and then click `Install`.

### Development Installs

Alternatively, after cloning from [github](https://www.github.com/tbogdala/evocaition-vscext) 
you can install this locally yourself if you have all of the development tools installed via 
Node already:

```bash
npm install -g @vscode/vsce
```

The extension can be built into a package file and then installed:

```bash
vsce package
code --install-extension evocaition-vscext-0.0.1.vsix
```



## License

This project is licensed under the [MIT License](LICENSE).