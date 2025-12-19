import { Injectable } from '@angular/core';
import { Groq } from 'groq-sdk';
import { environment } from '../../../environments/environment';
import * as fuzzball from 'fuzzball';
import { firstValueFrom } from 'rxjs';
import { ApiService } from './api';
import { AI_ITEMS_SYNONYMS } from '../ai/ai-items-synonyms';
import { AI_ITEMS_SYNONYMS_WEB } from '../ai/ai-items-synonyms-web';

type ItemInfo = { arname: string; unit: string; en: string };
type ItemMap = Record<string, ItemInfo>;
type ImageDescriptionResponse = {
  success: boolean;
  description?: string;
  message?: string;
  error?: string;
};

const SYSTEM_PROMPT = `
You are a professional AI assistant for a recycling app. Extract a list of materials, their quantities, and units from noisy, possibly misspelled, Arabic or English input.

The input text can be either:
- A free-form speech transcription from the user.
- A paragraph describing an image that contains recyclable items.

Rules:
- CRITICAL: Only return valid JSON in this exact format:
{
  "items": [
    {
      "material": "English name here",
      "quantity": float,
      "unit": "KG" | "pieces"
    }
  ]
}
- If you do not follow this, the system will fail.
- Only use materials from the provided list (see below). If a material is not in the list, ignore it.
- If a material appears multiple times with different phrases (e.g., "2 laptop" and "3 motherboard laptop"), treat them as SEPARATE items only if they are genuinely different materials.
- If the same material is mentioned multiple times (e.g., "2 laptop" and "1 laptop"), merge them by summing their quantities.
- For each material, use the canonical English name from the list.
- If the unit is missing or ambiguous, use the default unit for that material from the list.
- Accept both Arabic and English names, and be robust to typos and variants.
- If the quantity is missing, assume 1.
- Accept both singular and plural units ("piece", "pieces", "KG").
- Do not output any explanation, only the JSON array.
- Be precise with material identification - "motherboard laptop" should NOT be treated as "laptop" unless motherboard is not in the materials list.

Material List (English name, Arabic name, unit):
{MATERIAL_LIST}

Example:
Input: "3 كيلو بلاستيك و 2 كراسي و مكواة"
Output: {
  "items": [
    { "material": "Plastics", "quantity": 3, "unit": "KG" },
    { "material": "Chair", "quantity": 2, "unit": "pieces" },
    { "material": "Iron", "quantity": 1, "unit": "pieces" }
  ]
}
`;

export type ExtractedMaterial = {
  material: string;
  quantity: number;
  unit: string;
};

@Injectable({
  providedIn: 'root'
})
export class MaterialExtractionService {
  private itemsCache: ItemMap | null = null;
  private enToInfo: Record<string, ItemInfo> = {};
  private arToEn: Record<string, string> = {};
  private allNames: string[] = [];
  private synonymToCanonical: Record<string, string> = {
    // English synonyms for Airpods-like devices
    earbuds: 'airpods',
    earbud: 'airpods',
    earphones: 'airpods',
    headset: 'airpods',
    airpods: 'airpods',
    // English synonyms for other items
    'gramophone player': 'gramophone',
    // Arabic synonyms (will only apply if corresponding canonical exists in catalog)
    'جرامافون': 'gramophone',
    'سماعات اذن': 'airpods',
    'ايربودز': 'airpods',
    'إيربودز': 'airpods',
  };

  constructor(private api: ApiService) {}

  private normalizeUnit(unit: string): 'KG' | 'pieces' {
    const u = unit.trim().toLowerCase();
    if (['kg', 'كيلو', 'كجم', 'kilogram', 'kilograms'].includes(u)) return 'KG';
    return 'pieces';
  }

  private async loadItemsFromBackend(): Promise<ItemMap> {
    if (this.itemsCache) {
      return this.itemsCache;
    }

    try {
      // Fetch all items from backend
      const response = await firstValueFrom(
        this.api.get<any>('/categories/get-items', {
          params: { all: 'true' }
        })
      );

      // Support both legacy Node.js shape ({ success, items }) and .NET shape ({ items, total })
      const items: any[] =
        (response && Array.isArray(response.items) && response.items) ||
        (response && Array.isArray(response.data) && response.data) ||
        [];

      if (items.length > 0) {
        const itemMap: ItemMap = {};

        for (const item of items) {
          const enName = typeof item.name === 'object' ? item.name.en : item.name;
          const arName = typeof item.name === 'object' ? item.name.ar : '';
          const unit = item.measurement_unit === 1 ? 'KG' : 'pieces';

          if (enName) {
            itemMap[enName.toLowerCase()] = {
              en: enName,
              arname: arName,
              unit: unit
            };
          }
        }

        this.itemsCache = itemMap;
        this.buildMappings();
        return itemMap;
      }
    } catch (error) {
      console.error('Failed to load items from backend:', error);
    }

    // Return empty map if fetch fails
    return {};
  }

  private buildMappings(): void {
    this.enToInfo = {};
    this.arToEn = {};
    this.allNames = [];

    for (const [en, info] of Object.entries(this.itemsCache || {})) {
      this.enToInfo[en.toLowerCase()] = info as ItemInfo;
      if (info.arname) {
        this.arToEn[info.arname] = en;
      }
      this.allNames.push(en.toLowerCase(), info.arname);
    }

    try {
      const addSynList = (canonicalKey: string, list: unknown) => {
        if (!Array.isArray(list)) return;
        for (const raw of list as string[]) {
          if (!raw) continue;
          const s = raw.trim().toLowerCase();
          if (!s) continue;
          if (!this.synonymToCanonical[s]) {
            this.synonymToCanonical[s] = canonicalKey;
          }
        }
      };

      const mergeSource = (src: any) => {
        const entries = Object.entries(src || {});
        for (const [canonicalName, data] of entries) {
          if (!canonicalName) continue;
          const key = canonicalName.toLowerCase();
          if (!this.enToInfo[key]) {
            continue;
          }

          const anyData = data as any;
          addSynList(key, anyData.synonyms_en);
          addSynList(key, anyData.synonyms_ar);
          addSynList(key, anyData.synonyms_egy);
        }
      };

      mergeSource(AI_ITEMS_SYNONYMS as any);
      mergeSource(AI_ITEMS_SYNONYMS_WEB as any);
    } catch (err) {
      console.error('Failed to merge AI_ITEMS_SYNONYMS into synonym map', err);
    }
  }

  private mapToCanonicalMaterial(input: string): { name: string; unit: string } | null {
    const cleaned = input.trim().toLowerCase();
    
    console.log(`🔍 Mapping material: "${input}" -> cleaned: "${cleaned}"`);
    
    // Check explicit synonyms first (e.g., earbuds -> headphones)
    const canonicalFromSynonym = this.synonymToCanonical[cleaned];
    if (canonicalFromSynonym) {
      const key = canonicalFromSynonym.toLowerCase();
      const info = this.enToInfo[key];
      if (info) {
        console.log(`✅ Synonym match found: "${cleaned}" -> "${key}"`);
        return { name: key, unit: info.unit };
      }
    }
    
    // Try exact match first
    if (this.enToInfo[cleaned]) {
      console.log(`✅ Exact match found: "${cleaned}"`);
      return { name: cleaned, unit: this.enToInfo[cleaned].unit };
    }
    
    // Try fuzzy matching with higher threshold for better precision
    const matches = fuzzball.extract(cleaned, this.allNames, {
      scorer: fuzzball.token_set_ratio,
      limit: 5,
    });
    
    console.log(`🔍 Fuzzy matches for "${cleaned}":`, matches);
    
    const [bestMatch, score] = matches[0] || [null, 0];
    
    // Increase threshold to 85 for better precision
    if (bestMatch && score >= 85) {
      console.log(`✅ Fuzzy match found: "${cleaned}" -> "${bestMatch}" (score: ${score})`);
      
      if (this.enToInfo[bestMatch]) {
        return { name: bestMatch, unit: this.enToInfo[bestMatch].unit };
      }
      if (this.arToEn[bestMatch]) {
        return { name: this.arToEn[bestMatch], unit: this.enToInfo[this.arToEn[bestMatch]].unit };
      }
    }
    
    console.log(`❌ No suitable match found for: "${cleaned}" (best score: ${score})`);
    return null;
  }

  async extractMaterialsFromTranscription(transcription: string): Promise<ExtractedMaterial[]> {
    console.log(`🎤 Input transcription: "${transcription}"`);
    
    // Load items from backend if not cached
    await this.loadItemsFromBackend();

    if (!environment.groqApiKey || environment.groqApiKey === 'YOUR_GROQ_API_KEY_HERE') {
      throw new Error('Groq API key is not configured. Please add your Groq API key to environment.ts');
    }

    const client = new Groq({
      apiKey: environment.groqApiKey,
      dangerouslyAllowBrowser: true,
    });

    // Build material list string for prompt
    const materialList = Object.entries(this.itemsCache || {})
      .map(([en, info]) => `- ${en} (${info.arname}) [${info.unit}]`)
      .join('\n');

    const prompt = SYSTEM_PROMPT.replace('{MATERIAL_LIST}', materialList);

    const chatRes = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Input: ${transcription}` },
      ],
    });

    console.log('🤖 AI raw output:', chatRes.choices[0].message.content);

    let parsed: unknown[] = [];
    try {
      const raw = JSON.parse(chatRes.choices[0].message.content || '[]');
      console.log('📋 Parsed JSON structure:', raw);
      
      if (Array.isArray(raw)) {
        parsed = raw;
      } else if (raw && typeof raw === 'object') {
        if (Array.isArray(raw.items)) {
          parsed = raw.items;
        } else if (Array.isArray(raw.material)) {
          parsed = raw.material;
        } else {
          parsed = [];
        }
      } else {
        parsed = [];
      }
      console.log('📋 Extracted items array:', parsed);
    } catch (error) {
      console.error('❌ JSON parsing failed:', error);
      parsed = [];
    }

    const result: ExtractedMaterial[] = [];
    const materialMap = new Map<string, ExtractedMaterial>();
    
    for (const item of parsed as { material?: string; quantity?: number; unit?: string }[]) {
      if (!item.material) continue;
      
      console.log(`🔍 Processing AI extracted item: "${item.material}" (qty: ${item.quantity}, unit: ${item.unit})`);
      
      const mapped = this.mapToCanonicalMaterial(item.material);
      if (!mapped) {
        console.log(`❌ No mapping found for: "${item.material}"`);
        continue;
      }
      
      console.log(`✅ Mapped "${item.material}" -> "${mapped.name}" (correct unit: ${mapped.unit})`);
      
      const quantity = typeof item.quantity === 'number' ? item.quantity : 1;
      const unit = this.normalizeUnit(mapped.unit);
      const canonicalName =
        Object.keys(this.enToInfo).find((k) => k.toLowerCase() === mapped.name) ||
        mapped.name;
      
      // Check if material already exists in map
      const key = canonicalName.toLowerCase();
      if (materialMap.has(key)) {
        // Merge with existing material by adding quantities
        const existing = materialMap.get(key)!;
        existing.quantity += quantity;
        console.log(`🔄 Merged duplicate material: ${canonicalName} (${existing.quantity} total)`);
      } else {
        // Add new material
        materialMap.set(key, {
          material: canonicalName,
          quantity,
          unit,
        });
        console.log(`➕ Added new material: ${canonicalName} (${quantity} ${unit})`);
      }
    }
    
    // Convert map values to array
    result.push(...materialMap.values());
    
    console.log(`📋 Final extracted materials:`, result);

    // Fallback: try keyword-based matching to catch any missed items
    const fallback: ExtractedMaterial[] = [];
    const lowerText = transcription.toLowerCase();
    const existingMaterials = new Set(result.map(m => m.material.toLowerCase()));

    // Helper: detect when a label only appears inside a NEGATED example list,
    // e.g. "there are no other obvious recyclable items like plastic bottles,
    // cardboard boxes, metal cans ...". In that case we should NOT treat those
    // labels as actual materials in the image / transcription.
    const isNegatedExample = (label: string | undefined | null): boolean => {
      if (!label) return false;
      const search = label.toLowerCase();
      if (!search) return false;

      const idx = lowerText.indexOf(search);
      if (idx === -1) return false;

      const windowStart = Math.max(0, idx - 120);
      const windowEnd = idx + search.length;
      const context = lowerText.slice(windowStart, windowEnd);

      return /\bno\b[^.]{0,120}\b(like|such as)\b/i.test(context);
    };

    // Also clean the primary AI result from items that only appear inside
    // negated example lists (e.g., "no other items like cardboard boxes, metal cans").
    for (let i = result.length - 1; i >= 0; i--) {
      const m = result[i];
      if (isNegatedExample(m.material)) {
        console.log(`⚠️ Dropping negated example item from AI result: ${m.material}`);
        result.splice(i, 1);
      }
    }

    const getQuantityForLabel = (label: string | undefined | null): number | null => {
      if (!label) return null;
      const pattern = new RegExp(`(\\d+)\\s+${label}`, 'i');
      const match = pattern.exec(transcription);
      if (match && match[1]) {
        const q = parseFloat(match[1]);
        if (!isNaN(q) && q > 0) {
          return q;
        }
      }
      return null;
    };

    const added = new Set(existingMaterials);

    // Generic raw-material items that are considered "low priority" when a more
    // specific catalog item (e.g., Fridge, Basin mixer) is detected.
    // Stored in lowercase and always compared case-insensitively.
    const genericMaterials = new Set([
      'aluminium',
      'cans',
      'stainless',
      'tinplate',
      'copper',
      'solid plastic',
      'paper',
      'cardboard',
      'magazines',
      'newspaper',
    ]);

    const isGenericMaterial = (name: string | undefined | null): boolean => {
      if (!name) return false;
      return genericMaterials.has(name.toLowerCase());
    };

    const allResultAreGeneric =
      result.length > 0 && result.every((m) => isGenericMaterial(m.material));

    // 1) Match against catalog item names (English + Arabic)
    for (const info of Object.values(this.itemsCache || {})) {
      const enLower = (info.en || '').toLowerCase();
      const arLower = (info.arname || '').toLowerCase();

      if (!enLower && !arLower) continue;

      const key = enLower;
      if (key && added.has(key)) continue;

      if ((enLower && lowerText.includes(enLower)) || (arLower && lowerText.includes(arLower))) {
        // Skip items that are only mentioned as NEGATIVE examples
        if (isNegatedExample(enLower) || isNegatedExample(arLower)) {
          console.log(`⚠️ Skipping negated example mention for catalog item: ${info.en}`);
          continue;
        }
        const unit = this.normalizeUnit(info.unit);
        const qtyFromEn = getQuantityForLabel(enLower);
        const qtyFromAr = getQuantityForLabel(arLower);
        const quantity = qtyFromEn ?? qtyFromAr ?? 1;

        added.add(key);
        fallback.push({
          material: info.en,
          quantity,
          unit,
        });
        console.log(`🔁 Fallback matched catalog item from text: ${info.en} (qty: ${quantity})`);
      }
    }

    const hasAnySpecificSoFar =
      [...result, ...fallback].some((m) => !isGenericMaterial(m.material));

    // 2) Match explicit synonyms (e.g., earbuds -> headphones, سماعات اذن -> headphones)
    // Use this heavier synonym-based fallback when:
    // - The LLM + catalog-name fallback found nothing, OR
    // - The LLM only found generic raw materials (e.g., Stainless, Aluminium)
    //   and no specific catalog items. In that second case, synonyms can help
    //   recover a more precise item (e.g., faucet -> Basin mixer) and we will
    //   down-rank / drop the generic materials in favour of the specific one.
    if (!hasAnySpecificSoFar) {
      for (const [synonym, canonical] of Object.entries(this.synonymToCanonical)) {
        const synLower = synonym.toLowerCase();
        if (!lowerText.includes(synLower)) continue;

        // Also skip synonyms that only appear inside negated example lists
        if (isNegatedExample(synLower)) {
          console.log(`⚠️ Skipping negated example mention for synonym: ${synonym}`);
          continue;
        }

        const canonicalKey = canonical.toLowerCase();
        if (added.has(canonicalKey)) continue;

        const info = this.enToInfo[canonicalKey];
        if (!info) continue;

        const unit = this.normalizeUnit(info.unit);
        const qtyFromSyn = getQuantityForLabel(synLower);
        const quantity = qtyFromSyn ?? 1;

        added.add(canonicalKey);
        fallback.push({
          material: info.en,
          quantity,
          unit,
        });
        console.log(`🔁 Fallback matched synonym from text: ${synonym} -> ${info.en} (qty: ${quantity})`);
      }

      if (fallback.length > 0) {
        const hasSpecific = fallback.some((m) => !isGenericMaterial(m.material));
        if (hasSpecific) {
          for (let i = fallback.length - 1; i >= 0; i--) {
            const m = fallback[i];
            if (isGenericMaterial(m.material)) {
              fallback.splice(i, 1);
            }
          }

          // If the original AI result consisted only of generic materials
          // (e.g., Stainless) and we have now found one or more specific
          // catalog items via synonyms (e.g., Basin mixer for "faucet"),
          // drop those generic items from the final result to avoid
          // over-extracting raw materials when a clear specific item exists.
          if (allResultAreGeneric) {
            for (let i = result.length - 1; i >= 0; i--) {
              const m = result[i];
              if (isGenericMaterial(m.material)) {
                console.log(`⚠️ Dropping generic material in favour of specific synonym match: ${m.material}`);
                result.splice(i, 1);
              }
            }
          }
        }
      }
    }

    if (fallback.length > 0) {
      const combined = [...result, ...fallback];
      console.log('✅ Combined materials after fallback:', combined);
      return combined;
    }

    return result;
  }

  async describeImageOnBackend(imageFile: File): Promise<string> {
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      const response = await firstValueFrom(
        this.api.post<ImageDescriptionResponse>('/transcription/describe-image', formData)
      );

      if (response && response.success && response.description) {
        return response.description;
      }

      throw new Error(response?.message || response?.error || 'Image description failed');
    } catch (err: any) {
      console.error('Image description failed:', err);
      throw new Error(err?.message || 'Image description failed');
    }
  }

  async extractMaterialsFromImage(imageFile: File): Promise<ExtractedMaterial[]> {
    const description = await this.describeImageOnBackend(imageFile);
    return this.extractMaterialsFromTranscription(description);
  }
}

