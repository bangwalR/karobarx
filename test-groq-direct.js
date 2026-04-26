// Direct test of Groq API
const Groq = require('groq-sdk').default;

const groq = new Groq({
  apiKey: 'gsk_6t_yG9R1BWdOOv1ZrcrGiCXM7lfTUrn3PQchVGWw0OkPNMWSWActJxVVUvpFFLeB',
});

async function test() {
  console.log('Testing Groq API...');
  console.log('Model: llama-3.1-8b-instant');
  console.log('');

  try {
    console.log('Sending request...');
    const startTime = Date.now();

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'user', content: 'Say hello in one word' },
      ],
      temperature: 0.7,
      max_tokens: 50,
    });

    const duration = Date.now() - startTime;

    console.log('✅ SUCCESS!');
    console.log('Duration:', duration + 'ms');
    console.log('Response:', completion.choices[0]?.message?.content);
    console.log('Model:', completion.model);
    console.log('Usage:', completion.usage);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Status:', err.status);
    console.error('Code:', err.code);
    console.error('Type:', err.type);
    
    if (err.response) {
      console.error('Response:', err.response.data);
    }
  }
}

test();