import { cleanReadmeContent } from './readme-cleaner.js';

// Example README content with badges (similar to the one mentioned in the task)
const exampleReadme = `# llm-requesty

[![PyPI](https://img.shields.io/pypi/v/llm-requesty.svg)](https://pypi.org/project/llm-requesty/)
[![Changelog](https://img.shields.io/github/v/release/rajashekar/llm-requesty?include_prereleases&label=changelog)](https://github.com/rajashekar/llm-requesty/releases)
[![Tests](https://github.com/rajashekar/llm-requesty/workflows/Test/badge.svg)](https://github.com/rajashekar/llm-requesty/actions?query=workflow%3ATest)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](https://github.com/rajashekar/llm-requesty/blob/main/LICENSE)

[LLM](https://llm.datasette.io/) plugin for models hosted by [Requesty](https://requesty.ai/)

## Installation

First, [install the LLM command-line utility](https://llm.datasette.io/en/stable/setup.html).

Now install this plugin in the same environment as LLM.
\`\`\`bash
llm install llm-requesty
\`\`\`

## Configuration

You will need an API key from Requesty. You can [obtain one here](https://app.requesty.ai/analytics).

You can set that as an environment variable called \`requesty_KEY\`, or add it to the \`llm\` set of saved keys using:

\`\`\`bash
llm keys set requesty
\`\`\`
\`\`\`
Enter key: <paste key here>
\`\`\`

## Usage

To list available models, run:
\`\`\`bash
llm models list
\`\`\`
You should see a list that looks something like this:
\`\`\`
requesty: requesty/deepinfra/meta-llama/Meta-Llama-3.1-405B-Instruct
requesty: requesty/deepinfra/Qwen/Qwen2.5-72B-Instruct
requesty: requesty/deepinfra/meta-llama/Llama-3.3-70B-Instruct
...
\`\`\`

In requesty, you need to approve the models you want to use before you can prompt them. You can do this by running:
Click on [Admin Panel](https://app.requesty.ai/admin-panel?tab=models) and  then user "Add Model" to add the models you want to use.


To run a prompt against a model, pass its full model ID to the \`-m\` option, like this:
\`\`\`bash
llm -m requesty/google/gemini-2.5-flash-lite-preview-06-17 "Five spooky names for a pet tarantula"
\`\`\`

You can set a shorter alias for a model using...`;

/**
 * Example function to demonstrate badge removal
 */
export function demonstrateBadgeRemoval() {
  console.log('=== ORIGINAL README ===');
  console.log(exampleReadme);
  
  console.log('\n=== CLEANED README ===');
  const cleaned = cleanReadmeContent(exampleReadme);
  console.log(cleaned);
  
  console.log('\n=== COMPARISON ===');
  console.log(`Original length: ${exampleReadme.length} characters`);
  console.log(`Cleaned length: ${cleaned.length} characters`);
  console.log(`Removed: ${exampleReadme.length - cleaned.length} characters`);
  
  return cleaned;
}

// Uncomment to run the demonstration
// demonstrateBadgeRemoval();