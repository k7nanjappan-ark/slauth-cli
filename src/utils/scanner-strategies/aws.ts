import { OpenAIModels, Services } from '@slauth.io/langchain-wrapper';
import ScannerStrategy from '../../types/scanner-strategy';
import showAsyncSpinner from '../show-async-spinner';
import spinners from 'cli-spinners';
import { yellow } from '../colors';

export default class AWSScanner implements ScannerStrategy {
  async scan(codeSnippets: string[], modelName: keyof typeof OpenAIModels) {
    const snippetsPromises = Promise.all(
      codeSnippets.map(async snippet => snippet.replace(/\s+/g, ''))
    );

    await showAsyncSpinner(
      {
        spinner: spinners.dots,
        text: yellow(
          'Scanning for aws-sdk calls (this process might take a few minutes)'
        ),
      },
      snippetsPromises
    );

    const snippets = (await snippetsPromises).flat();

    const policiesPromise = Services.aws.getPoliciesFromSnippets(
      snippets,
      modelName
    );

    await showAsyncSpinner(
      {
        spinner: spinners.dots,
        text: yellow(
          'Generating policies (this process might take a few minutes)'
        ),
      },
      policiesPromise
    );

    return await policiesPromise;
  }
}