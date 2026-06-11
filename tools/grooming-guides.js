"use strict";

const guideCategories = [
  {
    slug: "techniques",
    name: "Technique Guides",
    shortName: "Techniques",
    description:
      "Practical dog grooming technique guides for brushing, de-matting, de-shedding, nail trimming, puppy introductions, bath routines, and mobile grooming prep.",
  },
  {
    slug: "seasonal-care",
    name: "Seasonal Care in Canada",
    shortName: "Seasonal care",
    description:
      "Canadian dog grooming advice for winter salt and ice, spring mud and shedding, summer heat and lake water, fall burrs, and regional weather challenges.",
  },
  {
    slug: "breed-guides",
    name: "Breed Grooming Guides",
    shortName: "Breed guides",
    description:
      "Breed-specific grooming notes for popular Canadian dogs, including coat type, brushing schedule, common trouble spots, and what to ask a groomer.",
  },
  {
    slug: "costs-and-booking",
    name: "Costs and Booking",
    shortName: "Costs",
    description:
      "Dog grooming cost, quote, appointment, and comparison guides for Canadian owners deciding what to book and what to ask first.",
  },
];

const guideSpecs = [
  techniqueGuide({
    slug: "line-brushing-curly-coated-dogs",
    title: "Line Brushing Curly-Coated Dogs: Poodles, Doodles, Bichons and Shih Tzus",
    metaTitle: "Line Brushing Curly-Coated Dogs | Poodle and Doodle Grooming",
    summary: "Learn how line brushing finds hidden tangles before they tighten close to the skin.",
    keywords: ["line brushing dogs", "curly coat dog grooming", "doodle mat prevention", "poodle brushing"],
    featured: true,
    need:
      "Curly and drop-coated dogs can look fluffy while mats form underneath. Line brushing separates the coat into small rows so a slicker brush and comb can reach the skin without pulling large sections at once.",
    home:
      "Start with a relaxed dog on a non-slip surface. Lift a thin layer of coat, brush the layer below it with short strokes, then use a metal comb to check the work before moving to the next row.",
    pro:
      "Ask your groomer which brush and comb match your dog's coat, how short the trim should be if the coat is not combable, and which friction zones need daily checks.",
    safety:
      "Stop if the dog flinches, guards the area, or the coat feels tight against the skin. Tight mats, red skin, or pelted coat should be assessed professionally.",
    bullets: ["Work in narrow rows instead of surface brushing.", "Comb behind ears, collar lines, armpits, feet, and tail base.", "Book maintenance before mats become painful."],
  }),
  techniqueGuide({
    slug: "safe-dematting-dogs",
    title: "Safe Dog De-Matting: When to Brush, Clip or Call a Groomer",
    metaTitle: "Safe Dog De-Matting Guide | Brush, Clip or Groomer",
    summary: "A comfort-first guide to judging mats, preventing injury, and choosing professional help when needed.",
    keywords: ["dog de-matting", "matted dog grooming", "safe dematting dogs", "matted dog coat"],
    featured: true,
    need:
      "Mats are not only cosmetic. They pull on skin, trap moisture, hide irritation, and can make normal movement uncomfortable. The safest plan starts with the dog's comfort, not with saving length at all costs.",
    home:
      "Loose tangles may be separated with fingers, detangling spray, a slicker brush, and a comb. Hold the coat between the tangle and skin and work from the outside edge inward.",
    pro:
      "Ask whether brushing out the coat is humane, whether a shorter reset is safer, how de-matting time is priced, and what schedule will prevent the problem from returning.",
    safety:
      "Do not cut mats with household scissors. Skin can fold into mats, and water can tighten a heavily matted coat before a groomer sees it.",
    bullets: ["Do not bathe a heavily matted dog first.", "Photograph problem areas before calling.", "Contact a veterinarian for odor, sores, swelling, bleeding, or pain."],
  }),
  techniqueGuide({
    slug: "double-coat-deshedding-guide",
    title: "Double-Coated Dog De-Shedding: Undercoat Care Without Damaging the Coat",
    metaTitle: "Double-Coated Dog De-Shedding Guide | Undercoat Care",
    summary: "A practical guide for huskies, shepherds, retrievers, collies, corgis, and other double-coated dogs.",
    keywords: ["double coated dog grooming", "dog de-shedding", "undercoat grooming", "should you shave double coated dogs"],
    featured: true,
    need:
      "A double coat has protective guard hairs and a softer undercoat. Grooming should remove loose undercoat and packed coat without damaging the outer layer that helps protect the skin.",
    home:
      "Brush in sections with tools suited to the coat. Undercoat rakes, slickers, rubber curries, and combs can all help, but heavy pressure and repeated scraping can irritate skin.",
    pro:
      "Ask for bath, blowout, de-shedding, nail care, and coat assessment rather than a routine shave unless there is a medical or severe coat condition reason.",
    safety:
      "Sudden shedding with bald patches, scabs, odor, itching, or skin redness should be discussed with a veterinarian.",
    bullets: ["Book extra help during spring and fall coat changes.", "Check pants, ruff, tail, and behind ears.", "De-shedding reduces loose coat but does not stop natural shedding."],
  }),
  techniqueGuide({
    slug: "dog-nail-trimming-grinding-guide",
    title: "Dog Nail Trimming and Grinding: How to Keep Paws Comfortable",
    metaTitle: "Dog Nail Trimming and Grinding Guide | Paw Care",
    summary: "Understand nail length, quicks, black nails, grinders, and winter paw traction.",
    keywords: ["dog nail trimming", "dog nail grinding", "black dog nails", "dog paw care"],
    need:
      "Long nails can change posture, reduce traction, snag on fabric, and make slippery floors harder for dogs to navigate. Nail care is especially important for seniors and dogs that do not wear nails down naturally.",
    home:
      "Handle paws briefly and reward calm behavior. If trimming at home, take tiny amounts from black nails and keep styptic powder nearby in case the quick is nicked.",
    pro:
      "Ask whether the business clips, grinds, or offers both. Mention past quicking, paw sensitivity, arthritis, fear, or thick nails before the appointment.",
    safety:
      "Painful, split, bleeding, infected, or broken nails need veterinary guidance. Groomers can maintain nails, but medical nail injuries are different.",
    bullets: ["Many dogs need nail care every 3 to 6 weeks.", "Grinding smooths edges but some dogs dislike vibration.", "Winter nail length affects traction on ice."],
  }),
  techniqueGuide({
    slug: "puppy-first-grooming-guide",
    title: "Puppy's First Groom: How to Build a Calm Grooming Routine",
    metaTitle: "Puppy's First Groom | Calm Puppy Grooming Guide",
    summary: "A first groom should teach trust, not just create a haircut.",
    keywords: ["puppy first groom", "puppy grooming Canada", "puppy grooming tips", "first puppy haircut"],
    need:
      "A puppy's first groom is partly about cleanliness and partly about learning. Short, positive visits can introduce bathing, drying, brushing, nail trimming, face handling, and table manners.",
    home:
      "Practice touching paws, ears, muzzle, tail, belly, and collar areas for a few seconds at a time, then reward. Keep brushing sessions short and calm.",
    pro:
      "Ask about age requirements, vaccination requirements, what a puppy intro includes, and how the groomer handles scared or wiggly puppies.",
    safety:
      "Do not wait until a high-maintenance puppy is badly matted. A shorter early trim may be kinder than forcing a long first groom.",
    bullets: ["Ask when adult coat changes may increase matting.", "Start with handling before expecting a perfect haircut.", "Book ahead because puppy-friendly appointments can fill quickly."],
  }),
  techniqueGuide({
    slug: "mobile-dog-grooming-prep",
    title: "How to Prepare for Mobile Dog Grooming at Home",
    metaTitle: "Mobile Dog Grooming Prep | At-Home Grooming Checklist",
    summary: "Mobile grooming can be convenient, but a smooth appointment starts before the van arrives.",
    keywords: ["mobile dog grooming", "mobile dog groomer prep", "at home dog grooming appointment"],
    need:
      "Mobile grooming brings the salon closer to home, but the groomer may need parking, safe access, weather flexibility, and clear coat and behavior notes before arrival.",
    home:
      "Give the dog a bathroom break, keep the coat dry unless instructed otherwise, secure other pets, and clear snow, ice, or clutter from the parking area.",
    pro:
      "Ask about service radius, travel fees, vehicle size, water or power requirements, cancellation policy, and what happens if the dog cannot finish safely.",
    safety:
      "Share biting history, dryer fear, seizures, heart issues, senior mobility, recent surgery, heavy matting, or skin problems before the appointment.",
    bullets: ["Confirm legal parking and weather policies.", "Send photos of mats or desired trim style.", "Ask whether the mobile unit is self-contained."],
  }),
  techniqueGuide({
    slug: "bath-and-brush-dog-grooming-guide",
    title: "Bath and Brush Dog Grooming: When a Full Haircut Is Not Needed",
    metaTitle: "Bath and Brush Dog Grooming Guide | Coat Maintenance",
    summary: "Learn when bath and brush appointments help maintain coat, skin, shedding, odor, and nails.",
    keywords: ["bath and brush dog grooming", "dog bath groomer", "brush out dog", "maintenance groom"],
    need:
      "Not every appointment needs a haircut. Bath and brush visits can remove dirt, loose coat, odor, and debris while maintaining nails, paws, ears, and skin checks.",
    home:
      "Brush before bathing if the dog has tangles. Water can tighten mats, especially on curly, drop, and friction-prone coats.",
    pro:
      "Ask what shampoo and conditioner are used, how the dog is dried, whether nails and ears are included, and whether de-shedding is part of the package.",
    safety:
      "Strong odors, red skin, repeated ear smell, hot spots, bleeding, or intense itching should be discussed with a veterinarian.",
    bullets: ["Bath and brush is useful between full grooms.", "Dry thick coats thoroughly after water.", "Ask whether sensitive-skin products are available."],
  }),
  techniqueGuide({
    slug: "senior-dog-grooming-comfort-guide",
    title: "Senior Dog Grooming: Comfort, Mobility and Shorter Appointments",
    metaTitle: "Senior Dog Grooming Comfort Guide | Mobility and Handling",
    summary: "Prepare senior dogs for safer grooming with mobility notes, shorter sessions, and realistic coat choices.",
    keywords: ["senior dog grooming", "old dog grooming", "arthritis dog grooming", "comfort groom"],
    need:
      "Older dogs may tire faster, stand less steadily, hear less, see less, or have sore joints. Grooming should prioritize comfort and clear communication.",
    home:
      "Keep coat manageable between appointments, handle paws gently, and note changes in lumps, skin, odor, mobility, or tolerance.",
    pro:
      "Ask about comfort grooms, breaks, non-slip surfaces, shorter trim options, appointment timing, and whether the dog can be groomed in stages.",
    safety:
      "Medical changes, painful skin, severe fatigue, breathing difficulty, or sudden behavior changes need veterinary advice before grooming decisions.",
    bullets: ["Share medication and mobility notes.", "Choose easy-maintenance trims.", "Ask whether two shorter visits are better than one long groom."],
  }),

  seasonalGuide({
    slug: "winter-dog-grooming-canada",
    title: "Winter Dog Grooming in Canada: Salt, Ice, Dry Skin and Paw Care",
    metaTitle: "Winter Dog Grooming in Canada | Salt, Ice and Paw Care",
    summary: "A Canada-focused winter grooming guide for snow, slush, road salt, dry indoor air, paws, and coat maintenance.",
    keywords: ["winter dog grooming Canada", "dog paw salt care", "ice balls dog paws", "winter dog coat care"],
    featured: true,
    challenge:
      "Canadian winters add road salt, slush, ice balls, snow crust, dry indoor air, static, and winter clothing to normal grooming needs.",
    routine:
      "Rinse or wipe paws after salted sidewalks, dry belly and leg coat after wet walks, and comb under collars, sweaters, harnesses, and armpits.",
    booking:
      "Ask for nail care, paw tidy, pad hair trimming if snowballs form, bath and brush, de-shedding for double coats, or a shorter practical trim for mat-prone coats.",
    caution:
      "Cracked, bleeding, swollen, or painful paws need veterinary advice. Grooming can support maintenance, but medical paw problems need medical care.",
    bullets: ["Do not leave damp winter gear on the dog.", "Keep nails maintained for traction.", "Choose coat length based on weather gear and brushing time."],
  }),
  seasonalGuide({
    slug: "spring-dog-shedding-mud-care",
    title: "Spring Dog Grooming in Canada: Mud, Shedding and Coat Reset",
    metaTitle: "Spring Dog Grooming Canada | Mud and Shedding",
    summary: "Spring grooming helps remove winter undercoat, reset muddy coat, and prevent moisture from tightening tangles.",
    keywords: ["spring dog grooming", "dog shedding spring Canada", "muddy dog grooming", "undercoat blowout"],
    featured: true,
    challenge:
      "Spring often reveals packed undercoat, dry winter coat, long nails, mud, pollen, and mats that formed under sweaters or harnesses.",
    routine:
      "Brush before bathing, dry wet legs and belly, check paws after muddy walks, and increase comb checks for curly or long coats.",
    booking:
      "Ask about de-shedding, bath and blowout, paw tidy, nail trim, mud-friendly trims, and whether a coat reset is needed before warmer weather.",
    caution:
      "Do not cover spring odor with strong products. Persistent odor, itch, redness, or ear smell can point to a medical issue.",
    bullets: ["Book de-shedding before heavy coat blow becomes packed.", "Keep feet and belly practical during mud season.", "Comb before water tightens tangles."],
  }),
  seasonalGuide({
    slug: "summer-dog-grooming-canada",
    title: "Summer Dog Grooming in Canada: Heat, Lake Water, Ticks and Coat Care",
    metaTitle: "Summer Dog Grooming Canada | Heat, Lakes and Ticks",
    summary: "Summer grooming should balance heat comfort, shedding, swimming, ticks, burrs, and skin checks.",
    keywords: ["summer dog grooming Canada", "dog grooming heat", "dog swimming coat care", "ticks dog grooming"],
    featured: true,
    challenge:
      "Summer adds heat, humidity, lake water, beach sand, ticks, burrs, hot pavement, and more outdoor activity to grooming routines.",
    routine:
      "Dry ears and dense coat after swimming, check skin and paws after hikes, brush out debris, and schedule grooming when the dog can travel and recover coolly.",
    booking:
      "Ask about de-shedding, bath and brush, tidy trims, nail care, paw checks, and practical coat length for your dog's breed and lifestyle.",
    caution:
      "Flat-faced, senior, heavy-coated, overweight, or medically fragile dogs need heat-aware appointment planning. Never rely on shaving as the only heat strategy.",
    bullets: ["Check ticks after walks.", "Dry coat after swimming.", "Avoid hot pavement and overheated grooming sessions."],
  }),
  seasonalGuide({
    slug: "fall-dog-coat-care-canada",
    title: "Fall Dog Grooming in Canada: Burrs, Wet Leaves and Winter Prep",
    metaTitle: "Fall Dog Grooming Canada | Burrs and Winter Prep",
    summary: "Fall grooming removes summer debris, manages coat transitions, and prepares paws and coat for winter gear.",
    keywords: ["fall dog grooming Canada", "dog burrs coat", "winter prep dog grooming", "fall shedding dogs"],
    challenge:
      "Fall brings rain, burrs, wet leaves, cooler nights, coat transitions, and the return of sweaters, jackets, and boots.",
    routine:
      "Check feet, ears, tail, pants, and belly after trail walks. Keep nails and paw hair tidy before sidewalks become icy.",
    booking:
      "Ask about de-shedding, outline tidy, paw tidy, nail trim, burr removal, and coat length that will work under winter gear.",
    caution:
      "Burrs and plant awns can hide in ears, toes, armpits, and feathering. Pain, swelling, or head shaking needs veterinary attention.",
    bullets: ["Prepare coat before winter clothing starts.", "Remove burrs before they twist into mats.", "Book ahead for holiday grooming demand."],
  }),
  seasonalGuide({
    slug: "rainy-weather-dog-grooming",
    title: "Rainy Weather Dog Grooming: Moisture, Odor and Mat Prevention",
    metaTitle: "Rainy Weather Dog Grooming | Moisture and Mat Prevention",
    summary: "A wet-weather guide for dogs in rainy coastal cities, muddy suburbs, and damp spring or fall climates.",
    keywords: ["rainy dog grooming", "wet dog coat mats", "dog odor rain", "muddy paws dog"],
    challenge:
      "Repeated dampness can tighten tangles, increase odor, collect dirt, and keep skin hidden under wet coat.",
    routine:
      "Towel dry legs and belly, use a comb after the coat dries, and keep entryway paw wipes or towels ready during wet weeks.",
    booking:
      "Ask about bath and brush maintenance, paw tidy, practical trims, and whether the coat needs to be shorter during rainy seasons.",
    caution:
      "Musty smell, redness, hot spots, or constant licking should not be treated as a normal wet-dog issue.",
    bullets: ["Dry before sweaters or harnesses go back on.", "Comb friction zones after damp walks.", "Do not bathe over hidden mats."],
  }),

  breedGuide({
    slug: "poodle-grooming-guide",
    title: "Poodle Grooming Guide: Haircuts, Brushing and Coat Maintenance",
    metaTitle: "Poodle Grooming Guide | Haircuts and Brushing",
    breed: "Poodle",
    coat: "Poodles have dense curly coat that keeps growing and can mat close to the skin even when the outside looks fluffy.",
    home: "Line brush and comb ears, collar lines, armpits, feet, legs, tail base, and any longer body coat several times a week.",
    pro: "Ask what trim length fits your brushing routine and how often to schedule full grooms or maintenance visits.",
    seasonal: "Winter jackets and spring mud can mat poodle coat quickly, so many owners choose shorter practical trims during harsh weather.",
    keywords: ["poodle grooming", "poodle haircut", "poodle brushing", "poodle mat prevention"],
    featured: true,
  }),
  breedGuide({
    slug: "doodle-grooming-guide",
    title: "Doodle Grooming Guide: Mats, Haircuts, Brushing and Coat Types",
    metaTitle: "Doodle Grooming Guide | Mats, Haircuts and Brushing",
    breed: "Doodle",
    coat: "Doodle coats vary widely: wavy, curly, woolly, loose, dense, or mixed across the same dog. Many mat underneath before the surface looks tangled.",
    home: "Use a slicker brush and metal comb in sections. Focus on ears, harness lines, armpits, belly, legs, feet, and tail after moisture or clothing.",
    pro: "Ask whether the coat is combable to the skin and what length prevents repeat matting until the next appointment.",
    seasonal: "Wet snow, spring mud, summer swimming, and sweaters can all tighten doodle tangles faster than owners expect.",
    keywords: ["doodle grooming", "doodle mats", "doodle haircut", "doodle brushing"],
    featured: true,
  }),
  breedGuide({
    slug: "doodle-dematting-haircut-guide",
    title: "Doodle De-Matting and Haircut Planning Guide",
    metaTitle: "Doodle De-Matting and Haircut Guide | Mat Prevention",
    breed: "Doodle",
    coat: "Many doodles need a haircut plan built around coat condition, not only a reference photo. Long fluffy styles require reliable combing to the skin.",
    home: "Check the coat with a comb after brushing. If the comb catches repeatedly, the haircut goal may need to be shorter for comfort.",
    pro: "Ask whether a mat can be brushed comfortably, whether clipping is kinder, and what maintenance interval prevents a repeat shave-down.",
    seasonal: "Harnesses, raincoats, snow, daycare, and lake water all create friction and moisture that can accelerate matting.",
    keywords: ["doodle de-matting", "doodle haircut", "doodle groomer", "doodle mat prevention"],
  }),
  breedGuide({
    slug: "golden-retriever-grooming-guide",
    title: "Golden Retriever Grooming Guide: De-Shedding, Feathering and Paws",
    metaTitle: "Golden Retriever Grooming Guide | De-Shedding and Bath",
    breed: "Golden Retriever",
    coat: "Golden retrievers have water-resistant double coats and feathering on legs, tail, chest, and belly that can collect debris and packed undercoat.",
    home: "Brush feathering, pants, tail, behind ears, and chest. Dry after swimming, snow, or mud before tangles tighten.",
    pro: "Ask for bath, blowout, de-shedding, paw tidy, nail care, and light outline work instead of a routine shave.",
    seasonal: "Spring and fall shedding, lake season, and winter slush make drying and undercoat removal especially useful.",
    keywords: ["golden retriever grooming", "golden retriever de-shedding", "golden retriever bath", "retriever feathering"],
  }),
  breedGuide({
    slug: "shih-tzu-grooming-guide",
    title: "Shih Tzu Grooming Guide: Face Care, Haircuts and Mat Prevention",
    metaTitle: "Shih Tzu Grooming Guide | Face Care and Mats",
    breed: "Shih Tzu",
    coat: "Shih Tzus have soft drop coats that can be kept long or clipped into practical pet trims. Face, ears, feet, and belly can mat quickly.",
    home: "Comb ears, beard, chest, armpits, feet, sanitary areas, and any longer coat. Keep the face clean and dry.",
    pro: "Ask about face shape, sanitary trim, feet, ear length, and whether a shorter pet trim will fit your maintenance routine.",
    seasonal: "Wet sidewalks, winter sweaters, and summer dust can make practical trims easier for many small dogs.",
    keywords: ["Shih Tzu grooming", "Shih Tzu haircut", "Shih Tzu face grooming", "Shih Tzu mats"],
  }),
  breedGuide({
    slug: "german-shepherd-grooming-guide",
    title: "German Shepherd Grooming Guide: Undercoat, Nails and Handling",
    metaTitle: "German Shepherd Grooming Guide | De-Shedding and Nails",
    breed: "German Shepherd",
    coat: "German shepherds have dense double coats that shed year-round and can blow coat heavily during seasonal transitions.",
    home: "Brush ruff, pants, tail, and behind ears in short sessions. Keep nails maintained for traction and tell groomers about dryer tolerance.",
    pro: "Ask about undercoat removal, bath and blowout, nail grinding, breaks, and handling for large or sensitive dogs.",
    seasonal: "Spring coat blow and winter ice make de-shedding and nail length especially important.",
    keywords: ["German shepherd grooming", "German shepherd de-shedding", "German shepherd nails", "undercoat care"],
  }),
  breedGuide({
    slug: "siberian-husky-grooming-guide",
    title: "Siberian Husky Grooming Guide: Coat Blow and De-Shedding",
    metaTitle: "Siberian Husky Grooming Guide | Coat Blow",
    breed: "Siberian Husky",
    coat: "Huskies have protective double coats that release undercoat heavily during coat blow periods.",
    home: "Brush gently with undercoat tools around pants, tail, belly, and ruff. Avoid repeated scraping that irritates skin or breaks guard hairs.",
    pro: "Ask for bath, blowout if tolerated, de-shedding, nail care, and a plan that does not rely on shaving a healthy double coat.",
    seasonal: "Summer grooming should focus on loose undercoat, shade, hydration, and avoiding overheated appointment times.",
    keywords: ["husky grooming", "husky de-shedding", "husky coat blow", "Siberian husky grooming"],
  }),
  breedGuide({
    slug: "bernese-mountain-dog-grooming-guide",
    title: "Bernese Mountain Dog Grooming Guide: Heavy Coat, Paws and Size",
    metaTitle: "Bernese Mountain Dog Grooming Guide | De-Shedding and Paws",
    breed: "Bernese Mountain Dog",
    coat: "Bernese mountain dogs have thick double coats and feathering that can collect snow, mud, burrs, and packed undercoat.",
    home: "Brush ruff, pants, belly, tail, and behind ears. Keep paw pads tidy if snowballs form and keep nails comfortable for secure footing.",
    pro: "Ask whether the shop can safely handle giant breeds, provide breaks, use non-slip surfaces, and dry dense coat thoroughly.",
    seasonal: "Winter snow, spring mud, and summer heat all require appointment planning for size, drying time, and comfort.",
    keywords: ["Bernese mountain dog grooming", "Bernese de-shedding", "large dog grooming", "dog paw care"],
  }),
  breedGuide({
    slug: "yorkshire-terrier-grooming-guide",
    title: "Yorkshire Terrier Grooming Guide: Haircuts, Fine Coat and Nails",
    metaTitle: "Yorkshire Terrier Grooming Guide | Yorkie Haircuts",
    breed: "Yorkshire Terrier",
    coat: "Yorkies have fine hair that can tangle, break, or mat, especially when kept longer than a practical pet trim.",
    home: "Brush gently, comb ears, chest, legs, and belly, and keep small nails on schedule.",
    pro: "Ask about puppy cuts, teddy trims, face shape, sanitary trims, foot care, and whether the coat needs conditioner or a shorter reset.",
    seasonal: "Winter clothing can mat fine coat, while wet spring walks can tangle feet and belly.",
    keywords: ["Yorkie grooming", "Yorkshire terrier haircut", "Yorkie coat care", "small dog grooming"],
  }),
  breedGuide({
    slug: "french-bulldog-grooming-guide",
    title: "French Bulldog Grooming Guide: Skin Folds, Nails, Shedding and Bathing",
    metaTitle: "French Bulldog Grooming Guide | Skin Folds and Nails",
    breed: "French Bulldog",
    coat: "French bulldogs do not need haircuts, but they still shed, collect dander, and need skin fold, nail, ear, and paw maintenance.",
    home: "Use gentle short-coat brushing, keep folds dry, and check paws after salt, heat, or rough surfaces.",
    pro: "Ask for calm, cool handling, gentle bath products, nail trimming or grinding, and awareness of breathing or spine concerns.",
    seasonal: "Summer heat requires caution for flat-faced dogs, while winter salt can irritate paws.",
    keywords: ["French bulldog grooming", "Frenchie skin folds", "French bulldog nails", "short coat dog grooming"],
  }),
  breedGuide({
    slug: "labrador-retriever-grooming-guide",
    title: "Labrador Retriever Grooming Guide: Shedding, Bathing and Swimming",
    metaTitle: "Labrador Retriever Grooming Guide | De-Shedding and Bath",
    breed: "Labrador Retriever",
    coat: "Labs have short double coats that shed more than many owners expect and can hold water, odor, and loose undercoat.",
    home: "Brush with short-coat and undercoat tools, dry after swimming, wipe muddy paws, and keep nails trimmed.",
    pro: "Ask about bath, blowout, de-shedding, ear checks after swimming, nail grinding, and skin-sensitive products.",
    seasonal: "Spring shedding, lake season, fall burrs, and winter salt all change the maintenance routine.",
    keywords: ["Labrador grooming", "Lab de-shedding", "Labrador bath", "short double coat grooming"],
  }),

  costGuide({
    slug: "dog-grooming-cost-canada",
    title: "Dog Grooming Cost in Canada: What Changes the Quote",
    metaTitle: "Dog Grooming Cost Canada | Quote Factors and Booking Guide",
    summary: "Understand what affects a grooming quote before you call, from coat condition to package scope.",
    keywords: ["dog grooming cost Canada", "dog grooming prices", "dog grooming quote", "full groom cost factors"],
    featured: true,
    topic:
      "Dog grooming quotes vary because a groom is not one fixed task. Size, coat type, coat condition, behavior, package scope, location, mobile setup, and add-ons can all change the appointment.",
    compare:
      "Compare what is included before comparing numbers. A bath-only visit, tidy-up, full groom, de-shedding appointment, matted-coat reset, and mobile visit may all be priced differently.",
    questions: ["What is included in the quoted package?", "What could change the price after arrival?", "Are de-matting, de-shedding, nail grinding, special shampoo, or travel fees extra?"],
  }),
  costGuide({
    slug: "how-to-compare-dog-groomers-canada",
    title: "How to Compare Dog Groomers in Canada Before You Book",
    metaTitle: "How to Compare Dog Groomers Canada | Booking Questions",
    summary: "Shortlist groomers by coat experience, policies, communication, price clarity, and local fit.",
    keywords: ["compare dog groomers", "choose a dog groomer", "dog groomer questions", "best dog groomer near me"],
    topic:
      "The best groomer for one dog may not be the best groomer for another. Start with breed or mix, coat type, age, size, behavior, health notes, and the service you need.",
    compare:
      "Use city pages to shortlist options, then confirm services, prices, package scope, new-client availability, de-matting policies, and handling of puppies, seniors, or anxious dogs.",
    questions: ["Do you have recent experience with this coat type?", "What happens if the coat is more matted than expected?", "How long does the appointment usually take?"],
  }),
  costGuide({
    slug: "dog-grooming-appointment-checklist",
    title: "Dog Grooming Appointment Checklist for Puppies, Seniors and Nervous Dogs",
    metaTitle: "Dog Grooming Appointment Checklist | Puppies, Seniors, Nervous Dogs",
    summary: "Prepare coat, health, behavior, and haircut notes before a first appointment.",
    keywords: ["dog grooming checklist", "first grooming appointment", "senior dog grooming", "nervous dog grooming"],
    topic:
      "A short note makes the booking conversation easier. Include age, breed or mix, weight, coat length, last groom date, known mats, behavior notes, and the service you want.",
    compare:
      "For puppies, mention vaccine timing and grooming exposure. For seniors, mention mobility, hearing, vision, arthritis, fatigue, medications, and handling limits.",
    questions: ["What should I practice at home before the visit?", "Can the dog have breaks or a shorter comfort groom?", "What trim length is realistic for the current coat?"],
  }),
  costGuide({
    slug: "dog-groomer-call-script",
    title: "Dog Groomer Call Script: Questions to Ask Before Booking",
    metaTitle: "Dog Groomer Call Script | Booking Questions",
    summary: "Use a clear call script to compare package scope, coat fit, policies, and quote clarity.",
    keywords: ["dog groomer call script", "questions for dog groomer", "book dog grooming", "dog grooming appointment"],
    topic:
      "A call script helps owners compare groomers without forgetting important details. Start with the dog's breed, coat type, age, size, last groom, and main grooming need.",
    compare:
      "Ask about coat experience, package scope, price range, policy details, vaccination requirements, appointment length, handling of nervous dogs, and what changes the plan.",
    questions: ["What is included in the full groom?", "How do you handle mats or anxious dogs?", "Are you accepting new clients in my area?"],
  }),
];

const guideArticles = guideSpecs.map((spec) => ({
  ...spec,
  description: spec.description || `${spec.summary} Written for Canadian dog owners comparing grooming needs, at-home maintenance, and professional services before booking.`,
  faqs: spec.faqs || defaultFaqs(spec),
}));

function techniqueGuide(spec) {
  return {
    category: "techniques",
    ...spec,
    sections: [
      section("Why this grooming technique matters", [spec.need, "Good technique protects the dog's comfort while making the appointment easier to plan. The goal is not speed; it is a routine that keeps coat, skin, nails, and paws in a safer condition between professional visits."], spec.bullets),
      section("At-home steps", [spec.home, "Keep sessions short, use calm rewards, and stop before the dog becomes overwhelmed. A small amount of consistent maintenance is usually more useful than a stressful marathon."], ["Work on a non-slip surface.", "Support sensitive areas with your fingers.", "Ask a groomer to demonstrate tools if you are unsure."]),
      section("What to ask a groomer", [spec.pro, "Specific questions help the groomer estimate time, choose tools, and explain what is realistic for the coat or handling needs."], ["Share photos of the current coat.", "Mention health, behavior, age, and past grooming issues.", "Ask for a prevention plan before leaving."]),
      section("Safety notes", [spec.safety, "Grooming advice is not a substitute for veterinary care. When pain, infection, injury, or sudden coat changes are present, contact a veterinarian."], ["Do not force painful handling.", "Do not hide behavior or health concerns.", "Choose comfort over appearance when the two conflict."]),
    ],
  };
}

function seasonalGuide(spec) {
  return {
    category: "seasonal-care",
    ...spec,
    sections: [
      section("Seasonal grooming challenge", [spec.challenge, "Canadian weather can change coat needs quickly. A routine that works in a dry indoor month may fail during snow, mud, lake season, or heavy shedding."], spec.bullets),
      section("At-home seasonal routine", [spec.routine, "Focus on the areas that collect moisture and friction: paws, belly, armpits, ears, collar lines, harness lines, tail, and feathering."], ["Dry damp coat before it is compressed by gear.", "Comb after the coat dries.", "Watch for odor, redness, licking, or soreness."]),
      section("What to book", [spec.booking, "A seasonal appointment should match your dog's coat type, lifestyle, and tolerance for grooming. Ask what package fits the actual problem instead of booking by name alone."], ["Confirm what is included.", "Ask whether add-ons are needed.", "Book ahead during busy seasonal changes."]),
      section("When to get extra help", [spec.caution, "Groomers can support maintenance, but medical skin, paw, ear, or pain concerns should be handled with veterinary advice."], ["Take photos of problem areas.", "Do not delay if the dog is uncomfortable.", "Keep notes for the next appointment."]),
    ],
  };
}

function breedGuide(spec) {
  return {
    category: "breed-guides",
    ...spec,
    summary: spec.summary || `${spec.breed} grooming needs depend on coat type, lifestyle, season, and the owner's home maintenance routine.`,
    sections: [
      section(`${spec.breed} coat basics`, [spec.coat, "Breed guides are starting points. Mixed coats, age, health, climate, and haircut choices can change the exact grooming plan."], ["Identify the coat type before choosing tools.", "Watch high-friction zones.", "Ask a groomer to check coat condition in person."]),
      section("Home maintenance", [spec.home, "The goal at home is to keep the dog comfortable until the next professional appointment, not to replace skilled grooming."], ["Use short, calm sessions.", "Comb after brushing when the coat is longer.", "Check nails and paws between appointments."]),
      section("Professional grooming questions", [spec.pro, "A useful booking conversation should include coat condition, appointment length, package scope, add-ons, and what will happen if the coat is matted or the dog is stressed."], ["Ask what trim length is realistic.", "Confirm nail, ear, paw, and sanitary details.", "Ask when to return."]),
      section("Seasonal Canadian care", [spec.seasonal, "Salt, snow, mud, rain, heat, lake water, burrs, and dry indoor air can all affect this breed's grooming plan."], ["Adjust brushing during wet or shedding seasons.", "Plan around sweaters, harnesses, and boots.", "Book before seasonal problems become urgent."]),
    ],
  };
}

function costGuide(spec) {
  return {
    category: "costs-and-booking",
    ...spec,
    sections: [
      section("What this guide helps with", [spec.topic, "A better booking conversation saves time and helps avoid surprises for both the owner and the groomer."], spec.questions),
      section("How to compare fairly", [spec.compare, "Do not compare only the lowest number. Compare communication, coat-specific experience, safety policies, what is included, and whether the schedule is realistic."], ["Ask for the package scope.", "Share coat and behavior details before booking.", "Confirm policies before arrival."]),
      section("Information to have ready", ["Prepare the dog's breed or mix, age, approximate weight, coat type, last groom date, matting history, behavior notes, health notes, and desired service.", "For complex coats, send current photos as well as inspiration photos so the groomer can judge what is possible."], ["Mention mats honestly.", "Mention senior, puppy, or anxiety needs.", "Write down the quoted package and return interval."]),
      section("After the appointment", ["Ask what the groomer noticed and what should change before the next visit. Notes about nails, mats, shedding, skin, ears, or brushing technique help prevent repeat problems.", "Book the next appointment before the coat is already difficult again."], ["Ask what brush or comb to use.", "Ask when to return.", "Save trim notes for next time."]),
    ],
  };
}

function section(heading, paragraphs, bullets) {
  return { heading, paragraphs, bullets };
}

function defaultFaqs(spec) {
  return [
    {
      question: `How often should I use this ${spec.category.replace(/-/g, " ")} advice?`,
      answer:
        "Use it as a planning starting point, then ask a professional groomer to adjust the schedule based on your dog's coat, skin, nails, age, behavior, lifestyle, and season.",
    },
    {
      question: "When should I call a groomer instead of handling it at home?",
      answer:
        "Call a groomer when mats are tight, the dog is uncomfortable, nails are overgrown, the coat is packed, or you are unsure which tools and trim length are safe.",
    },
  ];
}

module.exports = {
  guideCategories,
  guideArticles,
};
