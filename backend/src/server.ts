import 'dotenv/config';
import { openai } from './openai.js';
import { createApp } from './app.js';
import { interpretRequest } from './interpreter.js';

const app = createApp((request) => interpretRequest(openai, request));
app.listen(3001, () => { console.log('Backend listening on http://localhost:3001'); });
