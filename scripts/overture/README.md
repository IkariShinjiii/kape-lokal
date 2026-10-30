# Overture cafe import

Finds Iloilo City cafes in [Overture Maps Places](https://docs.overturemaps.org/guides/places) and compares them with our `cafes` table. Overture is open data: Meta (CDLA-Permissive-2.0) and Foursquare (Apache-2.0). This avoids scraping Google, which [docs/PLAN.md](../../docs/PLAN.md) rules out.

## Steps

1. **Download** the Iloilo map area into a working folder, outside the repo:
   ```sh
   pip install overturemaps
   # On Windows, Python's own certificate store can be out of date. Point it at certifi:
   export SSL_CERT_FILE="$(python -c 'import certifi;print(certifi.where())')"
   overturemaps download --bbox=122.4,10.58,122.7,10.86 -f geojsonseq -t place -o iloilo-places.geojsonl
   ```
2. **Filter.** Keep the cafe-like rows in `cafes-raw.json`: categories coffee_shop/cafe/tea, or names with coffee/cafe/kape.
3. **Export our cafes** to `db.tsv` with the columns `id-prefix  name  lat  lng  P|D|X` (published, draft or excluded).
4. **Match:** `python -I match.py <workdir>` writes `match.json`. It sorts rows into four groups:
   - **matched:** within 400 m with a similar name, or within 80 m with a loosely similar name
   - **new**
   - **chain**
   - **lowconf:** Overture confidence below 0.5
5. **Build SQL:** `python -I build.py <workdir> <this folder>` writes `enrich.sql` and `drafts.sql`.
   - `enrich.sql` fills only blank phone, Facebook and website fields, using `coalesce`.
   - `drafts.sql` inserts new cafes as unpublished drafts with `source = 'overture'` and `osm_id = 'overture/<id>'`.
   - Before running, check the `FORCE_KEEP`, `FORCE_DROP` and `CHAIN` lists in `build.py`.

## Rules

- **Never publish straight from Overture.** Most rows come from Facebook pages, and those stay up after a cafe closes. Confirm each cafe is open, for example on Google Maps by hand, before setting `is_published`.
- **Specialty tags need real evidence**, the same as before. Overture's category is not evidence.
- **Branches are separate entries.**

## First run (2026-10-30)

- 15,880 places in the area. 861 were cafe-like, and 611 of those are in Iloilo City.
- 63 existing cafes got missing Facebook links, phones or websites.
- 175 new drafts were added.
- Skipped:
  - 51 non-cafes, such as internet cafes, car washes and milk-tea-only shops
  - 7 in other towns
  - 16 likely duplicates
  - 156 low-confidence rows
