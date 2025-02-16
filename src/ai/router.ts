// src/ai/router.ts
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { AIMessage, HumanMessage } from 'langchain/schema';

async function analyzeMessage(message: string): Promise<string> {
  const chat = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.7,
  });

  const messages = [
    new HumanMessage(message),
    new AIMessage(`
      You are a helpful AI assistant that analyzes user messages and determines the appropriate service to route the message to.
      The available services are:
      - Therapy Service: For direct therapy-related inquiries.
      - Resource Service: For accessing helpful resources and information.
      - Appointment Service: For scheduling or managing appointments.
      - General Chat: For casual conversation or questions.

      Respond with the name of the service that the message should be routed to.
    `),
  ];

  const response = await chat.call(messages);
  return response.content;
}

export default analyzeMessage;
