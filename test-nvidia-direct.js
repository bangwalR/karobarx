const OpenAI = require('openai').default;

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

async function test() {
  console.log('Testing NVIDIA API with google/gemma-2-2b-it...');
  try {
    const startTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: 'google/gemma-2-2b-it',
      messages: [{ role: 'user', content: 'Say hello in one word' }],
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 50,
      stream: false,
    });
    console.log('✅ SUCCESS in', Date.now() - startTime, 'ms');
    console.log('Response:', completion.choices[0]?.message?.content);
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    console.error('Status:', err.status);
  }
}

test();
