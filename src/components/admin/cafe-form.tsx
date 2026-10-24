import { saveCafe } from "@/app/[lang]/admin/actions";
import { ILOILO_CENTER } from "@/lib/geo";
import { CAFE_TAGS, suggestTags, type CafeTag } from "@/lib/tags";
import { adminButton, adminInput } from "./shell";

export type CafeFormValues = {
  id?: string;
  name?: string;
  slug?: string;
  address?: string | null;
  description_en?: string | null;
  description_fil?: string | null;
  phone?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  opening_hours_osm?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_chain?: boolean;
  is_published?: boolean;
  is_excluded?: boolean;
  exclusion_reason?: string | null;
  tags?: CafeTag[];
  suggestionId?: string;
};

const TAG_LABEL: Record<CafeTag, string> = {
  specialty_coffee: "Specialty coffee",
  matcha: "Matcha",
  pastry: "Pastry",
  work_friendly: "Work-friendly",
  pet_friendly: "Pet-friendly",
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {label}
        {hint && <span className="text-mute"> · {hint}</span>}
      </span>
      {children}
    </label>
  );
}

export function CafeForm({ v }: { v: CafeFormValues }) {
  const tags = v.tags ?? [];
  const hints = suggestTags(v.name ?? "").filter((t) => !tags.includes(t));

  return (
    <form action={saveCafe} className="flex flex-col gap-4">
      {v.id && <input type="hidden" name="id" value={v.id} />}
      {v.suggestionId && <input type="hidden" name="suggestion_id" value={v.suggestionId} />}

      <Field label="Name">
        <input name="name" required defaultValue={v.name ?? ""} className={adminInput} />
      </Field>
      <Field label="Web address (slug)" hint="leave blank to use the name">
        <input name="slug" defaultValue={v.slug ?? ""} className={adminInput} />
      </Field>
      <Field label="Address or area">
        <input name="address" defaultValue={v.address ?? ""} className={adminInput} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" hint="right-click a spot in Google Maps to copy">
          <input
            name="lat"
            required
            inputMode="decimal"
            defaultValue={v.lat ?? ILOILO_CENTER.lat}
            className={adminInput}
          />
        </Field>
        <Field label="Longitude">
          <input
            name="lng"
            required
            inputMode="decimal"
            defaultValue={v.lng ?? ILOILO_CENTER.lng}
            className={adminInput}
          />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">Tags</legend>
        <div className="flex flex-wrap gap-3">
          {CAFE_TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="tags" value={tag} defaultChecked={tags.includes(tag)} />
              {TAG_LABEL[tag]}
              {hints.includes(tag) && <span className="text-xs text-ember">(name suggests this)</span>}
            </label>
          ))}
        </div>
        <p className="text-xs text-mute">Only tick a tag you have checked. Tags drive the Specialty and Matcha filters.</p>
      </fieldset>

      <Field label="Description (English)">
        <textarea name="description_en" rows={3} defaultValue={v.description_en ?? ""} className={adminInput} />
      </Field>
      <Field label="Description (Filipino)" hint="optional, falls back to English">
        <textarea name="description_fil" rows={3} defaultValue={v.description_fil ?? ""} className={adminInput} />
      </Field>
      <Field label="Opening hours" hint='for example "Mo-Su 08:00-20:00"'>
        <input name="opening_hours" defaultValue={v.opening_hours_osm ?? ""} className={adminInput} />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <input name="phone" defaultValue={v.phone ?? ""} className={adminInput} />
        </Field>
        <Field label="Website">
          <input name="website" defaultValue={v.website ?? ""} className={adminInput} />
        </Field>
        <Field label="Facebook" hint="link or page name">
          <input name="facebook" defaultValue={v.facebook ?? ""} className={adminInput} />
        </Field>
        <Field label="Instagram" hint="username">
          <input name="instagram" defaultValue={v.instagram ?? ""} className={adminInput} />
        </Field>
      </div>

      <fieldset className="flex flex-col gap-2 rounded border border-line p-3">
        <legend className="px-1 text-sm">Visibility</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_published" defaultChecked={v.is_published} />
          Published. Visitors can see this cafe.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_chain" defaultChecked={v.is_chain} />
          Chain. Hidden unless a visitor turns on &quot;Include chains&quot;.
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="is_excluded" defaultChecked={v.is_excluded} />
          Exclude. Not a cafe, or a duplicate. Never shown.
        </label>
        <Field label="Reason for excluding">
          <input name="exclusion_reason" defaultValue={v.exclusion_reason ?? ""} className={adminInput} />
        </Field>
      </fieldset>

      <button type="submit" className={`self-start ${adminButton}`}>
        {v.id ? "Save changes" : "Add cafe"}
      </button>
    </form>
  );
}
