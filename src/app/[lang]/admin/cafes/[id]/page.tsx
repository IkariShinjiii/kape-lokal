import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CafeForm } from "@/components/admin/cafe-form";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { AdminShell, adminButton, adminGhostButton, adminInput } from "@/components/admin/shell";
import { ADMIN_HOME, requireSignedIn } from "@/lib/admin";
import { mediaUrl } from "@/lib/supabase/public";
import type { CafeTag } from "@/lib/tags";
import {
  addMenuItem,
  deleteMenuImage,
  deleteMenuItem,
  uploadCoverImage,
  uploadMenuImage,
} from "../../actions";

export default function EditCafePage({ params, searchParams }: PageProps<"/[lang]/admin/cafes/[id]">) {
  return (
    <Suspense fallback={<p className="p-6 text-mute">Loading…</p>}>
      <EditCafe params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const UUID = /^[0-9a-f-]{36}$/i;

async function EditCafe({
  params,
  searchParams,
}: Pick<PageProps<"/[lang]/admin/cafes/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, user, isAdmin } = await requireSignedIn();

  if (!isAdmin) {
    return (
      <AdminShell email={user.email ?? ""}>
        <p className="rounded bg-crema p-4">This account isn&apos;t an admin.</p>
      </AdminShell>
    );
  }
  if (!UUID.test(id)) notFound();

  const { data: cafe } = await supabase
    .from("cafes")
    .select(
      "*, cafe_tags(tag), menu_items(id, category, name, description, price_php, is_available, sort_order), menu_images(id, image_path, sort_order)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!cafe) notFound();

  const saved = sp.saved === "1";
  const error = typeof sp.error === "string" ? sp.error : null;
  const items = [...cafe.menu_items].sort((a, b) => a.sort_order - b.sort_order);
  const images = [...cafe.menu_images].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <AdminShell email={user.email ?? ""}>
      <Link href={ADMIN_HOME} className="text-sm text-ember underline">
        ← All cafes
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-display text-4xl font-bold uppercase leading-none">{cafe.name}</h1>
        {cafe.is_published && !cafe.is_excluded && (
          <Link href={`/en/cafes/${cafe.slug}`} className="text-sm text-ember underline">
            View public page
          </Link>
        )}
      </div>
      {saved && <p role="status" className="rounded bg-crema p-3 text-leaf">Saved.</p>}
      {error && <p role="alert" className="rounded bg-crema p-3 text-ember">{error}</p>}

      <CafeForm
        v={{
          id: cafe.id,
          name: cafe.name,
          slug: cafe.slug,
          address: cafe.address,
          description_en: cafe.description_en,
          description_fil: cafe.description_fil,
          phone: cafe.phone,
          website: cafe.website,
          facebook: cafe.facebook,
          instagram: cafe.instagram,
          opening_hours_osm: cafe.opening_hours_osm,
          lat: cafe.lat,
          lng: cafe.lng,
          is_chain: cafe.is_chain,
          is_published: cafe.is_published,
          is_excluded: cafe.is_excluded,
          exclusion_reason: cafe.exclusion_reason,
          tags: (cafe.cafe_tags as { tag: CafeTag }[]).map((t) => t.tag),
        }}
      />

      <section className="flex flex-col gap-3 border-t border-line pt-6">
        <h2 className="font-display text-2xl font-bold uppercase text-ember">Cover photo</h2>
        {cafe.cover_image_path && (
          <Image
            src={mediaUrl(cafe.cover_image_path)}
            alt=""
            width={600}
            height={240}
            className="h-40 w-full rounded object-cover"
          />
        )}
        <PhotoUpload action={uploadCoverImage.bind(null, id)} label="Upload cover" />
      </section>

      <section id="menu" className="flex flex-col gap-4 border-t border-line pt-6 scroll-mt-4">
        <h2 className="font-display text-2xl font-bold uppercase text-ember">Menu</h2>

        {items.length > 0 && (
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 border-t border-line py-2">
                <div className="min-w-0">
                  <p>
                    {item.name}
                    {item.category && <span className="text-mute"> · {item.category}</span>}
                    {!item.is_available && <span className="text-mute"> · unavailable</span>}
                  </p>
                  {item.description && <p className="truncate text-sm text-mute">{item.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {item.price_php !== null && <span className="tabular-nums text-mute">₱{item.price_php}</span>}
                  <form action={deleteMenuItem.bind(null, id, item.id)}>
                    <button className={adminGhostButton}>Remove</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form action={addMenuItem.bind(null, id)} className="grid gap-3 rounded bg-crema p-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            Item name
            <input name="name" required className={adminInput} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Category
            <input name="category" placeholder="Espresso, Matcha, Pastry…" className={adminInput} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Price (₱)
            <input name="price_php" inputMode="decimal" className={adminInput} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <input name="description" className={adminInput} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_available" defaultChecked />
            Available
          </label>
          <button className={`justify-self-start ${adminButton}`}>Add item</button>
        </form>

        <h3 className="text-sm text-mute">Menu photos</h3>
        {images.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img) => (
              <li key={img.id} className="flex flex-col gap-2">
                <Image
                  src={mediaUrl(img.image_path)}
                  alt="Menu"
                  width={300}
                  height={400}
                  className="h-40 w-full rounded object-cover"
                />
                <form action={deleteMenuImage.bind(null, id, img.id, img.image_path)}>
                  <button className={adminGhostButton}>Remove</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <PhotoUpload action={uploadMenuImage.bind(null, id)} label="Upload menu photo" />
      </section>
    </AdminShell>
  );
}
