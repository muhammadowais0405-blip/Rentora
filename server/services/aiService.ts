import { GoogleGenAI, Type } from '@google/genai';
import {
  aiListingDraftSchema,
  aiSearchFiltersSchema,
  ALLOWED_CATEGORY_SLUGS,
  extractFallbackSearchFilters,
} from '../../src/utils/aiHelpers';
import type { AiListingDraft, AiSearchFilters } from '../../src/types/marketplace';

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function generateAiListingDraft(params: {
  imageBase64?: string;
  mimeType?: string;
  ownerNotes: string;
}): Promise<AiListingDraft> {
  const ai = getGeminiClient();
  if (!ai) {
    throw new Error(
      'AI Listing Generator is unavailable because GEMINI_API_KEY is not configured. You can still complete the listing manually.',
    );
  }

  const parts: Array<
    | { inlineData: { mimeType: string; data: string } }
    | { text: string }
  > = [];

  if (params.imageBase64 && params.mimeType) {
    parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: params.imageBase64,
      },
    });
  }

  parts.push({
    text: `Analyze this rental item photo and the owner's notes below, then draft an accurate, helpful peer-to-peer rental listing.

Owner notes: ${params.ownerNotes.trim() || 'No extra notes provided.'}

Allowed category slugs (pick exactly one):
- cameras-photography (DSLR/mirrorless cameras, lenses, tripods, action cams, studio lights)
- gaming-consoles (PlayStation, Xbox, controllers, VR headsets)
- bikes-cycles (road bikes, mountain bikes, city cycles, helmets/locks)
- electronics-equipment (projectors, laptops, tablets, speakers, microphones)

Strict accuracy rules:
1. Do NOT invent an exact brand or model name unless it is clearly visible in the photo or explicitly stated in owner notes.
2. Do NOT claim the item is tested, fully functional, or in mint condition from a photo alone.
3. Do NOT invent accessories, warranty, or rental prices.
4. Keep the title concise (under 75 chars) and the description practical for renters (2-4 sentences).`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: { parts },
    config: {
      systemInstruction:
        'You assist peer-to-peer rental owners on Rentora by drafting factual, conservative listing suggestions from photos and notes.',
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          suggestedTitle: {
            type: Type.STRING,
            description: 'Concise factual listing title under 75 characters.',
          },
          suggestedDescription: {
            type: Type.STRING,
            description: 'Clear 2-4 sentence rental description without invented claims.',
          },
          suggestedCategorySlug: {
            type: Type.STRING,
            description: `One of: ${ALLOWED_CATEGORY_SLUGS.join(', ')}`,
          },
          suggestedSubcategory: {
            type: Type.STRING,
            description: 'Short subcategory label such as Mirrorless, PlayStation, Road & Gravel, Projectors.',
          },
          suggestedTags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 5 short lowercase tags.',
          },
          visibleAttributes: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Up to 5 factual visual observations from the photo.',
          },
        },
        required: [
          'suggestedTitle',
          'suggestedDescription',
          'suggestedCategorySlug',
          'suggestedSubcategory',
          'suggestedTags',
          'visibleAttributes',
        ],
      },
    },
  });

  const rawText = (response.text ?? '').trim();
  if (!rawText) {
    throw new Error('AI returned an empty draft. Please try again or fill fields manually.');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error('AI response could not be parsed cleanly. Please try again.');
  }

  const validated = aiListingDraftSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error('AI suggestion did not match listing schema. Please try again or enter details manually.');
  }

  return validated.data;
}

export async function parseAiRentalQuery(queryText: string): Promise<{
  filters: AiSearchFilters;
  usedFallback: boolean;
  notice?: string;
}> {
  const ai = getGeminiClient();
  if (!ai) {
    return {
      filters: extractFallbackSearchFilters(queryText),
      usedFallback: true,
      notice: 'Gemini API key is not configured locally; matched using keyword and PKR budget rules.',
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Extract structured rental search filters from this renter request:
"${queryText.trim()}"

Allowed categorySlug values (or null if unclear):
- cameras-photography
- gaming-consoles
- bikes-cycles
- electronics-equipment`,
      config: {
        systemInstruction:
          'Convert a user rental request into structured JSON filters for querying a real SQLite marketplace database. Never invent listing IDs or prices.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            categorySlug: {
              type: Type.STRING,
              nullable: true,
              description: 'Exact allowed category slug or null.',
            },
            maxDailyPrice: {
              type: Type.INTEGER,
              nullable: true,
              description: 'Maximum daily price in PKR if mentioned, otherwise null.',
            },
            minDailyPrice: {
              type: Type.INTEGER,
              nullable: true,
              description: 'Minimum daily price in PKR if mentioned, otherwise null.',
            },
            keywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Relevant gear or location keywords.',
            },
            requestedDays: {
              type: Type.INTEGER,
              nullable: true,
              description: 'Requested rental duration in days if mentioned, otherwise null.',
            },
            summary: {
              type: Type.STRING,
              description: 'Short 1-sentence summary of what the renter is looking for.',
            },
          },
          required: [
            'categorySlug',
            'maxDailyPrice',
            'minDailyPrice',
            'keywords',
            'requestedDays',
            'summary',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    const parsedJson = JSON.parse(rawText);
    const validated = aiSearchFiltersSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new Error('Malformed filter schema from Gemini');
    }

    return {
      filters: validated.data,
      usedFallback: false,
    };
  } catch (error) {
    console.warn('Gemini rental query fallback triggered:', error);
    return {
      filters: extractFallbackSearchFilters(queryText),
      usedFallback: true,
      notice: 'AI service was temporarily unavailable; matched your request using local catalog rules.',
    };
  }
}
