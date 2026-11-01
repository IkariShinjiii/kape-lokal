import Anthropic from "@anthropic-ai/sdk";
import { cleanMenuItems, type ReadItem } from "@/lib/menu-items";

// Reads a cafe menu from photos with Claude, for the admin page. Nothing is
// saved here: the admin checks the list before it goes into the database.
// Needs ANTHROPIC_API_KEY in the environment.

export const MENU_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type MenuImageType = (typeof MENU_IMAGE_TYPES)[number];

export class MenuReaderError extends Error {}

const nullable = (type: "string" | "number") => ({ anyOf: [{ type }, { type: "null" }] });

const SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: nullable("string"),
          name: { type: "string" },
          price_php: nullable("number"),
          description: nullable("string"),
        },
        required: ["category", "name", "price_php", "description"],
        additionalProperties: false,
      },
    },
    note: nullable("string"),
  },
  required: ["items", "note"],
  additionalProperties: false,
};

const PROMPT = `These photos show a cafe's menu in Iloilo City, Philippines. List every food and drink item you can read.

For each item:
- name: the item's name as printed, in normal capitalization ("Caramel Macchiato", not "CARAMEL MACCHIATO"). Keep the cafe's own spelling.
- category: the menu section it is listed under, such as "Espresso", "Non-coffee" or "Pastries", capitalized the same way. Use null if the menu has no sections.
- price_php: the price in Philippine pesos as a plain number. When an item has several sizes, or a hot and an iced price, use the lowest and list the options in description.
- description: any short text printed with the item, then the size or temperature options with their prices, for example "Hot ₱120 / Iced ₱140". Use null if there is nothing.

Only include what is printed. If a price can't be read, use null rather than guessing. Leave out add-ons that aren't items on their own, such as an extra shot or a syrup.

Use note for anything the person checking your list should know, such as a cut-off or blurry photo, or a page that isn't a menu. Otherwise use null.`;

export async function readMenu(
  images: { data: string; mediaType: MenuImageType }[],
): Promise<{ items: ReadItem[]; note: string | null }> {
  const client = new Anthropic();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // If a safety check ever declines the request, the API retries it on
      // another model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // Reading a menu is transcription, so low effort is enough and keeps it fast.
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [
        {
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image" as const,
              source: { type: "base64" as const, media_type: img.mediaType, data: img.data },
            })),
            { type: "text" as const, text: PROMPT },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new MenuReaderError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new MenuReaderError("Too many requests right now. Try again in a minute.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new MenuReaderError(`Claude couldn't use these photos: ${error.message}`);
    }
    if (error instanceof Anthropic.APIConnectionError) {
      throw new MenuReaderError("Couldn't reach Claude. Check the connection and try again.");
    }
    if (error instanceof Anthropic.APIError) {
      throw new MenuReaderError(`Claude returned an error (${error.status}). Try again.`);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new MenuReaderError("Claude declined to read these photos.");
  }
  if (response.stop_reason === "max_tokens") {
    throw new MenuReaderError("This menu is too long to read in one go. Try one page at a time.");
  }
  const text = response.content.find(
    (b): b is Anthropic.Beta.BetaTextBlock => b.type === "text",
  )?.text;
  let parsed: { items?: unknown; note?: unknown };
  try {
    parsed = JSON.parse(text ?? "");
  } catch {
    throw new MenuReaderError("Claude's answer couldn't be read. Try again.");
  }
  return {
    items: cleanMenuItems(parsed.items),
    note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim() : null,
  };
}
