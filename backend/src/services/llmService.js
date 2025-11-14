import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Logger } from '../middlewares/logger.js';

class LLMService {
  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.temperature = parseFloat(process.env.LLM_TEMPERATURE) || 0.0;
    this.maxTokens = parseInt(process.env.LLM_MAX_TOKENS) || 800;

    // Initialize based on provider
    if (this.provider === 'google') {
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        Logger.warn('GOOGLE_AI_API_KEY not set, LLM features will be unavailable');
      } else {
        this.googleAI = new GoogleGenerativeAI(apiKey);
        this.model = process.env.LLM_MODEL || 'gemini-pro';
      }
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        Logger.warn('OPENAI_API_KEY not set, LLM features will be unavailable');
      } else {
        this.client = new OpenAI({ apiKey });
        this.model = process.env.LLM_MODEL || 'gpt-4';
      }
    }
  }

  /**
   * Build system prompt with schema and constraints
   */
  buildSystemPrompt(schema, userRole) {
    return `You are a MongoDB query generator. Return only JSON, no explanation or markdown.

Input: {userQuery, schema, userRole, context}
Output format: {
  "mongoQuery": <valid Mongo find/aggregate object>,
  "explain": "<plain-language explanation>",
  "requiresIndexes": [fieldPaths],
  "safety": {"allowed": true|false, "reason": "..."}
}

CONSTRAINTS:
- NEVER return commands that modify or delete data
- NEVER include shell meta-commands or code comments
- Only use safe aggregation stages: $match, $group, $sort, $limit, $project, $lookup, $unwind, $count
- FORBIDDEN stages: $where, $function, $accumulator, $merge, $out, $addFields with JS, $eval
- If ambiguous, return safety.allowed=false with reason
- Use provided schema to map natural-language to collection fields
- For dates without explicit range, add warning in explain
- Current date is ${new Date().toISOString().split('T')[0]}

SCHEMA:
${JSON.stringify(schema, null, 2)}

USER ROLE: ${userRole}

EXAMPLES:

User: "Show customers from New York with lifetime value over 5000"
Output:
{
  "mongoQuery": {
    "collection": "customers",
    "find": { "city": "New York", "lifetime_value": { "$gt": 5000 } }
  },
  "explain": "Find customers in city 'New York' with lifetime_value > 5000.",
  "requiresIndexes": ["city", "lifetime_value"],
  "safety": { "allowed": true, "reason": "Read-only find operation" }
}

User: "Top 5 products by revenue last quarter"
Output:
{
  "mongoQuery": {
    "collection": "orders",
    "aggregate": [
      { "$unwind": "$items" },
      { "$match": { "created_at": { "$gte": "2025-07-01", "$lt": "2025-10-01" } } },
      { "$group": { "_id": "$items.product_id", "revenue": { "$sum": { "$multiply": ["$items.qty", "$items.price"] } } } },
      { "$sort": { "revenue": -1 } },
      { "$limit": 5 }
    ]
  },
  "explain": "Aggregate orders to compute revenue per product in Q3 2025, sort desc, limit 5.",
  "requiresIndexes": ["created_at", "items.product_id"],
  "safety": { "allowed": true, "reason": "Aggregation with allowed stages." }
}

User: "Delete all old records"
Output:
{
  "mongoQuery": {},
  "explain": "This operation requires write permission. The system is read-only for NL queries.",
  "requiresIndexes": [],
  "safety": { "allowed": false, "reason": "Detected write/delete operation. Disallowed." }
}`;
  }

  /**
   * Translate natural language to MongoDB query
   */
  async translateQuery(userQuery, schema, userRole = 'viewer', context = {}) {
    try {
      Logger.info('LLM translation request', { userQuery, userRole, provider: this.provider });

      const systemPrompt = this.buildSystemPrompt(schema, userRole);
      
      const userPrompt = `User Query: "${userQuery}"
Context: ${JSON.stringify(context)}

Generate MongoDB query following the constraints above.`;

      let responseText;
      let tokensUsed = 0;

      if (this.provider === 'google') {
        // Google AI (Gemini)
        const model = this.googleAI.getGenerativeModel({ model: this.model });
        const fullPrompt = systemPrompt + '\n\n' + userPrompt;
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: this.temperature,
            maxOutputTokens: this.maxTokens,
          }
        });
        
        responseText = result.response.text();
        tokensUsed = result.response.usageMetadata?.totalTokenCount || 0;
      } else {
        // OpenAI
        const completion = await this.client.chat.completions.create({
          model: this.model,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        });

        responseText = completion.choices[0].message.content.trim();
        tokensUsed = completion.usage.total_tokens;
      }

      Logger.debug('LLM raw response', { responseText });

      // Parse JSON response
      const parsedResponse = this.parseJsonResponse(responseText);

      // Validate structure
      this.validateResponse(parsedResponse);

      Logger.info('LLM translation successful', {
        collection: parsedResponse.mongoQuery?.collection,
        queryType: parsedResponse.mongoQuery?.find ? 'find' : 'aggregate',
        safetyAllowed: parsedResponse.safety?.allowed
      });

      return {
        success: true,
        data: parsedResponse,
        tokensUsed
      };

    } catch (error) {
      Logger.error('LLM translation failed', error);
      throw error;
    }
  }

  /**
   * Parse JSON response from LLM (handles markdown code blocks)
   */
  parseJsonResponse(text) {
    try {
      // Remove markdown code blocks if present
      let cleaned = text.trim();
      
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse LLM response as JSON: ${error.message}`);
    }
  }

  /**
   * Validate LLM response structure
   */
  validateResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be an object');
    }

    if (!response.mongoQuery || typeof response.mongoQuery !== 'object') {
      throw new Error('Missing or invalid mongoQuery field');
    }

    if (!response.safety || typeof response.safety !== 'object') {
      throw new Error('Missing or invalid safety field');
    }

    if (typeof response.safety.allowed !== 'boolean') {
      throw new Error('safety.allowed must be boolean');
    }

    if (!response.explain || typeof response.explain !== 'string') {
      throw new Error('Missing or invalid explain field');
    }

    if (!Array.isArray(response.requiresIndexes)) {
      throw new Error('requiresIndexes must be an array');
    }

    const query = response.mongoQuery;
    
    if (!query.collection) {
      throw new Error('mongoQuery must include collection name');
    }

    if (!query.find && !query.aggregate) {
      throw new Error('mongoQuery must include find or aggregate');
    }

    return true;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      provider: this.provider,
      model: this.model,
      temperature: this.temperature,
      maxTokens: this.maxTokens
    };
  }
}

export default new LLMService();
