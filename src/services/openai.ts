import { ChatOpenAI } from 'langchain/chat_models/openai';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import JSONSchemas from '../utils/json-schemas';
import prompts from '../utils/prompts';
import { z } from 'zod';
import {
  StatementsOpenAIResultSchema,
  StatementArraySchema,
  PolicyDocumentsOpenAIResultSchema,
} from '../types/zod-aws-policy';
import CloudProviders from '../utils/cloud-providers';

const modelName = 'gpt-4-32k';

export async function getStatementsFromCode(
  code: string,
  cloudProvider: keyof typeof CloudProviders
) {
  const llm = new ChatOpenAI({ modelName, temperature: 0 });
  const functionCallingModel = llm.bind({
    functions: [
      {
        name: 'statements_output_formatter',
        description: 'Should always be used to properly format output',
        parameters: JSONSchemas.statementsOpenAIResultSchema,
      },
    ],
    function_call: {
      name: 'statements_output_formatter',
    },
  });

  const outputParser = new JsonOutputFunctionsParser();
  const chain =
    prompts[cloudProvider].DETECT_STATEMENTS_PROMPT.pipe(
      functionCallingModel
    ).pipe(outputParser);

  const response = await chain.invoke({
    code,
  });

  const validResponse = StatementsOpenAIResultSchema.parse(response);

  return validResponse.statements;
}

export async function getPoliciesFromStatements(
  statements: z.infer<typeof StatementArraySchema>,
  cloudProvider: keyof typeof CloudProviders
) {
  if (!statements.length) {
    return;
  }

  const llm = new ChatOpenAI({ modelName, temperature: 0 });
  const functionCallingModel = llm.bind({
    functions: [
      {
        name: 'policy_documents_output_formatter',
        description: 'Should always be used to properly format output',
        parameters: JSONSchemas.policyDocumentsOpenAIResultSchema,
      },
    ],
    function_call: {
      name: 'policy_documents_output_formatter',
    },
  });

  const outputParser = new JsonOutputFunctionsParser();
  const chain =
    prompts[cloudProvider].GENERATE_POLICIES_PROMPT.pipe(
      functionCallingModel
    ).pipe(outputParser);

  const response = await chain.invoke({
    statements: JSON.stringify(statements, null, 2),
  });

  const validResponse = PolicyDocumentsOpenAIResultSchema.parse(response);

  return validResponse.policyDocuments;
}
