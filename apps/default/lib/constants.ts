export const COUNTIES = [
  "Rostock (kreisfreie Stadt)",
  "Schwerin (kreisfreie Stadt)",
  "Landkreis Rostock",
  "Landkreis Ludwigslust-Parchim",
  "Landkreis Mecklenburgische Seenplatte",
  "Landkreis Nordwestmecklenburg",
  "Landkreis Vorpommern-Greifswald",
  "Landkreis Vorpommern-Rügen",
] as const;

export const CITIES = [
  "Schwerin", "Rostock", "Wismar", "Stralsund", "Greifswald",
  "Neubrandenburg", "Güstrow", "Waren (Müritz)", "Bergen auf Rügen",
  "Anklam", "Parchim", "Ludwigslust", "Hagenow", "Boizenburg",
  "Bad Doberan", "Ribnitz-Damgarten", "Demmin", "Teterow",
  "Malchin", "Sassnitz", "Binz", "Kühlungsborn", "Warnemünde",
  "Barth", "Grimmen", "Wolgast", "Pasewalk", "Ueckermünde",
  "Torgelow", "Heringsdorf", "Zinnowitz",
] as const;

export const INTERESTS = [
  // Sports & Fitness
  "Fußball", "Handball", "Basketball", "Volleyball", "Tennis",
  "Schwimmen", "Laufen", "Radfahren", "Wandern", "Klettern",
  "Yoga", "Pilates", "CrossFit", "Boxen", "Kampfsport",
  "Surfen", "Segeln", "Angeln", "Reiten", "Golf",
  "Tischtennis", "Badminton", "Skifahren", "Snowboarden", "Eislaufen",
  "Tanzen", "Skateboarden", "Fitness", "Bodybuilding", "Triathlon",
  // Music & Arts
  "Musik", "Gitarre", "Klavier", "Schlagzeug", "Gesang",
  "DJ", "Rap", "Hip-Hop", "Techno", "Rock",
  "Jazz", "Klassik", "Pop", "Electronic", "Metal",
  "Malerei", "Zeichnen", "Fotografie", "Film", "Theater",
  "Skulptur", "Graffiti", "Streetart", "Design", "Mode",
  "Kalligraphie", "Töpfern", "Handwerk", "Stricken", "Nähen",
  // Tech & Science
  "Programmieren", "Gaming", "KI", "Robotik", "3D-Druck",
  "Web-Design", "App-Entwicklung", "Cybersecurity", "Datenanalyse", "Blockchain",
  "Astronomie", "Physik", "Biologie", "Chemie", "Mathematik",
  "Elektronik", "Drohnen", "VR/AR", "Nachhaltigkeit", "Umweltschutz",
  // Food & Drink
  "Kochen", "Backen", "Grillen", "Vegane Küche", "Vegetarisch",
  "Kaffee", "Tee", "Wein", "Craft Beer", "Cocktails",
  "Streetfood", "Restaurants", "Food-Fotografie", "Meal Prep", "Ernährung",
  // Lifestyle
  "Reisen", "Camping", "Vanlife", "Meditation", "Mindfulness",
  "Lesen", "Schreiben", "Podcasts", "Blogging", "Vlogging",
  "Minimalism", "Interior Design", "Gartenarbeit", "DIY", "Upcycling",
  "Tattoos", "Piercing", "Sneaker", "Streetwear", "Vintage",
  // Social & Community
  "Ehrenamt", "Politik", "Philosophie", "Geschichte", "Sprachen",
  "Networking", "Startups", "Business", "Marketing", "Finanzen",
  "Recht", "Psychologie", "Pädagogik", "Sozialarbeit", "Tierschutz",
  // Entertainment
  "Kino", "Serien", "Anime", "Manga", "Comics",
  "Brettspiele", "Kartenspiele", "Escape Rooms", "Quiz", "Rätsel",
  "Stand-Up", "Karaoke", "Poetry Slam", "Cosplay", "LARP",
  // Regional MV
  "Ostsee", "Strandleben", "Plattdeutsch", "Mecklenburg Kultur",
  "Vorpommern Kultur", "Hanse", "Backsteingotik", "Nationalpark",
  "Seenplatte", "Inselhopping", "Leuchtturm-Touren", "Fischerei",
  "Bernstein", "Störtebeker", "Hansesail", "Warnemünder Woche",
  // Nature & Outdoor
  "Natur", "Vogelbeobachtung", "Pilze sammeln", "Waldwandern",
  "Kanufahren", "Kajak", "Stand-Up Paddling", "Tauchen",
  "Geocaching", "Sternbeobachtung", "Fotowandern", "Naturschutz",
  // Automotive
  "Autos", "Motorräder", "Oldtimer", "Tuning", "Motorsport",
  "E-Mobilität", "Fahrrad-Kultur", "Carsharing",
  // Wellness & Health
  "Wellness", "Sauna", "Spa", "Heilpraktik", "Aromatherapie",
  "Akupunktur", "Massagen", "Mental Health", "Achtsamkeit",
  // Pets
  "Hunde", "Katzen", "Pferde", "Aquaristik", "Terraristik",
  // Education
  "Studium", "Ausbildung", "Weiterbildung", "Sprachkurse", "Workshops",
  "Mentoring", "Coaching", "Persönlichkeitsentwicklung",
  // Nightlife & Party
  "Clubbing", "Bar-Hopping", "Festivals", "Open-Air", "Nachtleben",
  "Afterwork", "Pub Quiz", "Spieleabend",
  // Family
  "Familie", "Kinder", "Eltern-Kind", "Babysitting", "Spielplätze",
  // Spirituality
  "Spiritualität", "Astrologie", "Tarot", "Kirche", "Buddhismus",
] as const;

export const ADMIN_EMAIL = "live@z-social.com";

export const SUBSCRIPTION_PLANS = [
  { id: "monthly", name: "Monatlich", price: 4.99, interval: "month" },
  { id: "yearly", name: "Jährlich", price: 39.99, interval: "year", savings: "33%" },
] as const;
