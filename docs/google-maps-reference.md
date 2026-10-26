# Google Maps reference notes (2026-10-25)

What Google Maps showed for the local cafes checked in the audit. Use it as a cross-check, not as the source of record. Ratings are Google's and are shown here for context only.

**Terms of use.** Addresses, phone numbers and hours are facts, but Google's terms restrict copying or storing Maps content in bulk. Before launch, confirm each cafe's details with the owner (Facebook or Instagram message), and fix OpenStreetMap too, which is the legitimate source of record for this app. Do not copy Google reviews or photos.

## Verified: pin within 150 m, open, address and phone found

| Cafe | Google rating | Category | Phone | Hours (Google) | Status |
|---|---|---|---|---|---|
| Bluejay Coffee & Company (Ayala Technohub) | 4.2 (142) | Coffee shop | - | - | Published |
| BnC (Diversion Rd, Dungon B, Jaro) | - | - | - | - | Published |
| Book Latté Café (Festive Walk) | 3.7 (84) | Cafe | 0977 693 6081 | Open 24 hours | Published |
| Bruskoffee (Molo) | 4.6 (32) | Coffee shop | - | Opens 7 AM | Published |
| Cafe Año (Angelicum, Jaro) | 4.5 (15) | Cafe | 0908 821 1342 | 7 AM-7 PM daily | Published |
| Cafe Aroma (Festive Walk) | 4.5 (19) | Cafe | 0945 547 6861 | 5:30 AM-12 AM daily | Published |
| Café Augusto (inside Panaderia de Molo) | 4.6 (49) | Cafe | 0954 270 5635 | Opens 9 AM | Published, pin corrected |
| Café et Al (Molo) | 4.2 (11) | Coffee shop | 0929 595 6364 | - | Published, pin 1.4 km off in OSM |
| Café Gloria (Sto. Niño Sur, Arevalo) | 4.6 (92) | Cafe | 0906 210 4880 | Tu-Su 11 AM-8 PM | Published |
| Celina's Pastry Café (Molo) | 4.8 (5) | Cafe | 0928 243 6731 | 9 AM-8 PM daily | Published |
| Cicada Café (Marymart) | 4.9 (22) | Coffee shop | 0917 581 1188 | Mo-Sa 9 AM-6 PM | Published |
| Coffee Brewtherhood (Jaro) | 4.8 (165) | Cafe | 0976 383 4478 | 7:30 AM-10 PM daily | Published |
| D' Cupp Coffee and Tea (Molo) | 5.0 (7) | Coffee shop | 0962 347 7248 | Mo-Fr 9-7, Sa 10-5 | Published |
| Desserts in the Sky (San Rafael) | 5.0 (3) | Cafe | (033) 321 5229 | Mo-Sa 10 AM-8 PM | Published |
| Harbor Town Café | 4.6 (8) | Cafe | (033) 337 2384 | 6 AM-9:30 PM daily | Published |
| Healthy Kitchen Cafe (Q. Abeto) | 4.7 (269) | Health food restaurant | 0945 978 6995 | - | Published |
| House of Monkeys Cafe (Atria) | 3.7 (82) | Restaurant | 0917 148 6141 | 6 AM-9 PM daily | Published |
| Iloilo Coffee House (Villa Arevalo) | 4.5 (158) | Coffee shop | (033) 331 2867 | 8 AM-8 PM daily | Published |
| Kabuki Cafe (Villa Arevalo) | - | Cafe | 0939 103 8290 | - | Published (pin 133 m off) |
| 3rd Gen Glory's Cafe (Quezon St) | 4.4 (143) | Coffee shop | 0917 620 5688 | Open, closes 9 PM | Published, renamed from OSM "Glory's Cafe" |
| Madge Café (Atria) | 4.4 (696) | Cafe | (033) 501 6673 | 10 AM-9 PM daily | Published |
| Mostly Matcha (Fajardo St, Jaro) | 5.0 (27) | Tea house | - | Tu-Su afternoons, Mon closed | Published |
| Superhouse (Jaro) | 4.9 (30) | Coffee wholesaler | 0917 890 5761 | 8 AM-6 PM daily | Published. Google lists it as a wholesaler, so confirm it serves drinks |
| Ñuwave Specialty Coffee (Jaro) | 4.9 (59) | Coffee shop | - | 11 AM-midnight | Published, added by hand |
| The Yield Specialty Coffee (Jaro) | 4.9 (214) | Coffee shop | - | 7 AM-8 PM | Published, added by hand |
| Drip Coffee & Community (Mandurriao) | 4.7 (160) | Coffee shop | 0977 886 8660 | 7 AM-8 PM | Published, added by hand |

Held back, with SQL waiting in [pending-db-updates.sql](pending-db-updates.sql): Chapter Coffee (La Paz) and Kai Royal Cafe (pin was 4 km off in OSM, Google has it in Molo, hours 8 AM-2:30 AM).

## Excluded as permanently closed or not a cafe
13th Street Espresso, Basic, Bistro Marino, Cafe Tercero, Cafégasm, Dova Cafe, Dulgies, Hide Away, C U Tomorrow, one Cafe Lilia point (Lopez Jaena), Cafe Lilia (Commission Civil St), Bluejay (Aquino Ave, closed), bebor & mila talabahan (oyster restaurant). The data shows the OSM import is stale: about one in five cafes checked was already closed.

## Unverified, still drafts
- **Abyan's:** Google's pin for it is about 25 km away, so the listing may be mislocated. Ask the owner.
- **StirBear:** the lookup didn't find it near our point. It has its own website, stirbear.com.
- **Not found near the OSM point:** Benito's Place, Café Panay, Café Seoul, Celo Café, Ceylon Coffee Club, Coffee Stroll, David Tea House, De Leonian's Kapehan, Fuel.ph, Jom's Coffee, K Spice (looks like a restaurant), Kape Benderan, Kapehan ni Akhoy, Hereafter (no hours or phone), Centrale (no hours or phone).
- **bean there.:** a local specialty brand with four real branches (SM Terminal Market on Mabini St, Iloilo Central Market on Guanco St, 72 Jalandoni St, 1928 E Lopez St). Each needs its own pin. Worth doing by hand.
- **Not yet checked (about 40):** Kucho-kucho, Kurucafe, Kurukape ×2 (both resolve to "Molo Mansion"), Le Reve, Local Coffee, Loco, Mac's Garahe, Madge ×3, Mauro's, Miracle's, Monkey Grounds ×2, Neighbor Coffee, Newpost, Nothing But Desserts, Oriens, Papoo, Pie's Surprise, Rapha Palm, Roven Coffee Hub, Sa Poste, Sailor's, Sanctis, Santey Barley, Seventy N, Shortcut to Coffee, Space Bar, Takuri, Taza Verde, The Clinic Coffee, The Coffee Studio, The Cravery, The Meating Point, Tinukib, Xin Café.

Marked as a chain: JD (JD Bakery Cafe, several branches). Left unclassified: Carlo's Cafe (looks like the Carlo's Bakeshop chain).

## Round 3 (2026-10-26)
Published (open on Google, pin within 15 m for single results): Kucho Cafe (SM City), Kurukape (Molo), Monkey Grounds Coffee (Aquino Ave), Neighbor Coffee, Loco, Oriens Keurig, Sa Poste (SM Central Market), Seventy N Coffee + Drinkery, Shortcut to Coffee, Space Bar, Takuri Cafe, The Clinic Coffee, The Coffee Studio.
Excluded: Nothing But Desserts, Miracle's Cafe and two Kurukape points near Kucho (permanently closed), Rapha Palm (wellness centre).
Held back as drafts: Papoo Cafe, Roven Coffee Hub, Sanctis, Santé Barley, Taza Verde Garden Cafe and The Cravery (one to three Google reviews, so not enough evidence it is open and a cafe), Pie's Surprise (category unclear), Tinukib (a pasalubong centre), Mac's Garahe (Google pin 1.4 km from ours), the second Monkey Grounds point, Local Coffee (HQ, needs an address), Madge x2 (need addresses), Madge at 10.70834,122.55171 (no match within 150 m), Le Reve, Mauro's, Newpost, Sailor's, The Meating Point (not found), Xin Café (lookup failed).
Lookup lesson: a closed label on a list page can belong to any card, and the phone and rating read from a list sidebar can belong to a neighbouring result. Trust a closed flag, but read phone, rating and hours only from a single-result page.

## Specialty tag evidence
Only three cafes carry the specialty tag, each with a source:
- The Yield Specialty Coffee: SCA-certified member, Cup of Excellence beans and pour-over on the menu (ibsdigital.net, 2025 and 2026).
- Ñuwave Specialty Coffee: its own Instagram bio says "Serving Specialty Coffee". Its bio hours are 11am-1am.
- Drip Coffee & Community: Inquirer Lifestyle recommends it for specialty coffee (lifestyle.inquirer.net, "new coffee shops on our radar").
No evidence found for Cicada, Coffee Brewtherhood, Chapter Coffee, Superhouse or bean there., so they stay untagged. Madge is a traditional coffee shop (since 1940), not specialty.

## Method
Each cafe was looked up on Google Maps with a search centered on its OSM point. A cafe counted as verified only if Google listed it as open (or with hours or a phone) and its pin sat within about 150 m of ours. Where Google's pin was farther, the pin was corrected from Google's place coordinates, since those are more exact than a hand-placed OSM node.
