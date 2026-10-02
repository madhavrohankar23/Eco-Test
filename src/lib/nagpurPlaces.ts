/**
 * Comprehensive Curated Nagpur Points of Interest (POIs), Landmarks,
 * Malls, Colleges, Hospitals, Resorts, Lakes, and Major Localities.
 */

export interface NagpurPOI {
  id: string;
  name: string;
  category:
    | "Mall"
    | "Resort"
    | "Lake"
    | "College"
    | "Hospital"
    | "Temple"
    | "Monument"
    | "Transit"
    | "Locality"
    | "Office"
    | "Shop"
    | "Restaurant"
    | "Bank";
  subtitle: string;
  lat: number;
  lon: number;
  keywords: string[];
}

export const NAGPUR_POIS: NagpurPOI[] = [
  // ─── RESORTS & LEISURE ───
  {
    id: "poi_dream_valley",
    name: "Dream Valley Resort",
    category: "Resort",
    subtitle: "Digdoh, Hingna, Nagpur",
    lat: 21.1006,
    lon: 78.9903,
    keywords: ["dream", "valley", "resort", "hingna", "digdoh", "waterpark", "picnic"],
  },
  {
    id: "poi_fun_n_food",
    name: "Fun N Food Village Water Park",
    category: "Resort",
    subtitle: "Amravati Road, Bazargaon, Nagpur",
    lat: 21.1512,
    lon: 78.7845,
    keywords: ["fun", "food", "village", "water", "park", "amravati", "road"],
  },
  {
    id: "poi_krazy_castle",
    name: "Krazy Castle Aqua Park",
    category: "Resort",
    subtitle: "Opp. Ambazari Lake, North Ambazari Road",
    lat: 21.1292,
    lon: 79.0438,
    keywords: ["krazy", "castle", "aqua", "park", "ambazari"],
  },
  {
    id: "poi_highland_waterfront",
    name: "Highland Waterfront",
    category: "Resort",
    subtitle: "Near Gorewada Lake, Katol Road, Nagpur",
    lat: 21.1965,
    lon: 79.0345,
    keywords: ["highland", "waterfront", "gorewada", "lake", "resort"],
  },

  // ─── MALLS & SHOPPING ───
  {
    id: "poi_vr_mall",
    name: "VR Nagpur Mall (Trillium Mall)",
    category: "Mall",
    subtitle: "Medical Square, Untkhana, Nagpur",
    lat: 21.1288,
    lon: 79.0985,
    keywords: ["vr", "mall", "trillium", "medical", "square", "untkhana", "shopping", "cinema"],
  },
  {
    id: "poi_empress_mall",
    name: "Empress City Mall",
    category: "Mall",
    subtitle: "Near Gandhi Sagar Lake, Cotton Market, Nagpur",
    lat: 21.1448,
    lon: 79.0945,
    keywords: ["empress", "city", "mall", "gandhi", "sagar", "cotton", "market"],
  },
  {
    id: "poi_eternity_mall",
    name: "Eternity Mall",
    category: "Mall",
    subtitle: "Variety Square, Sitabuldi, Nagpur",
    lat: 21.1432,
    lon: 79.0782,
    keywords: ["eternity", "mall", "variety", "square", "sitabuldi", "inox"],
  },
  {
    id: "poi_fortune_mall",
    name: "Fortune Mall",
    category: "Mall",
    subtitle: "Sitabuldi, Nagpur",
    lat: 21.1425,
    lon: 79.0815,
    keywords: ["fortune", "mall", "sitabuldi"],
  },
  {
    id: "poi_jaswant_tuli_mall",
    name: "Jaswant Tuli Mall",
    category: "Mall",
    subtitle: "Indora Chowk, Kamptee Road, Nagpur",
    lat: 21.1735,
    lon: 79.1022,
    keywords: ["jaswant", "tuli", "mall", "indora", "kamptee", "road"],
  },
  {
    id: "poi_dharampeth_shopping",
    name: "Dharampeth Shopping Market",
    category: "Mall",
    subtitle: "West High Court (WHC) Road, Dharampeth",
    lat: 21.1418,
    lon: 79.0601,
    keywords: ["dharampeth", "market", "whc", "road", "shopping", "clothes", "jewelry"],
  },
  {
    id: "poi_sadar_bazaar",
    name: "Sadar Residency Market",
    category: "Mall",
    subtitle: "Residency Road, Sadar, Nagpur",
    lat: 21.1610,
    lon: 79.0820,
    keywords: ["sadar", "bazaar", "residency", "road", "haldiram"],
  },
  {
    id: "poi_itwari_market",
    name: "Itwari Wholesale Market",
    category: "Mall",
    subtitle: "Itwari, Central Nagpur",
    lat: 21.1535,
    lon: 79.1125,
    keywords: ["itwari", "market", "cloth", "grain", "sarafa"],
  },

  // ─── LAKES & PARKS ───
  {
    id: "poi_futala_lake",
    name: "Futala Lake Waterfront & Promenade",
    category: "Lake",
    subtitle: "Bharat Nagar, West Nagpur",
    lat: 21.1542,
    lon: 79.0435,
    keywords: ["futala", "lake", "waterfront", "promenade", "fountain", "sunset"],
  },
  {
    id: "poi_ambazari_lake",
    name: "Ambazari Lake & Garden",
    category: "Lake",
    subtitle: "Ambazari, South-West Nagpur",
    lat: 21.1275,
    lon: 79.0390,
    keywords: ["ambazari", "lake", "garden", "boating"],
  },
  {
    id: "poi_gorewada_zoo",
    name: "Balasaheb Thackeray Gorewada International Zoo & Lake",
    category: "Lake",
    subtitle: "Katol Road, Gorewada, Nagpur",
    lat: 21.1985,
    lon: 79.0420,
    keywords: ["gorewada", "lake", "zoo", "safari", "jungle", "katol"],
  },
  {
    id: "poi_gandhisagar_lake",
    name: "Gandhisagar Lake (Shukrawari Talao)",
    category: "Lake",
    subtitle: "Raman Science Centre, Mahal, Nagpur",
    lat: 21.1440,
    lon: 79.0980,
    keywords: ["gandhisagar", "shukrawari", "talao", "lake", "raman", "science"],
  },
  {
    id: "poi_japanese_garden",
    name: "Japanese Rose Garden & Seminary Hills",
    category: "Lake",
    subtitle: "Seminary Hills, Civil Lines, Nagpur",
    lat: 21.1685,
    lon: 79.0610,
    keywords: ["japanese", "garden", "seminary", "hills", "rose"],
  },
  {
    id: "poi_botanical_garden",
    name: "PKV Botanical Garden",
    category: "Lake",
    subtitle: "Near Maharajbagh, Bajaj Nagar Road, Nagpur",
    lat: 21.1390,
    lon: 79.0685,
    keywords: ["botanical", "garden", "pkv", "maharajbagh"],
  },

  // ─── COLLEGES & UNIVERSITIES ───
  {
    id: "poi_vnit",
    name: "VNIT (Visvesvaraya National Institute of Tech)",
    category: "College",
    subtitle: "South Ambazari Road, Bajaj Nagar, Nagpur",
    lat: 21.1245,
    lon: 79.0520,
    keywords: ["vnit", "visvesvaraya", "national", "institute", "technology", "engineering", "bajaj", "nagar"],
  },
  {
    id: "poi_aiims_nagpur",
    name: "AIIMS Nagpur",
    category: "College",
    subtitle: "Sector 20, MIHAN, Nagpur",
    lat: 21.0365,
    lon: 79.0290,
    keywords: ["aiims", "all", "india", "medical", "hospital", "mihan"],
  },
  {
    id: "poi_iim_nagpur",
    name: "IIM Nagpur",
    category: "College",
    subtitle: "MIHAN, Non-SEZ Area, Nagpur",
    lat: 21.0395,
    lon: 79.0340,
    keywords: ["iim", "management", "institute", "mihan"],
  },
  {
    id: "poi_iiit_nagpur",
    name: "IIIT Nagpur",
    category: "College",
    subtitle: "Behind BSNL Regional Training, Butibori, Nagpur",
    lat: 20.9515,
    lon: 79.0310,
    keywords: ["iiit", "information", "technology", "butibori"],
  },
  {
    id: "poi_gmc_nagpur",
    name: "GMC (Government Medical College & Hospital)",
    category: "College",
    subtitle: "Medical Square, Hanuman Nagar, Nagpur",
    lat: 21.1320,
    lon: 79.0965,
    keywords: ["gmc", "government", "medical", "college", "hospital", "hanuman", "nagar"],
  },
  {
    id: "poi_rcoem",
    name: "Ramdeobaba University (RCOEM)",
    category: "College",
    subtitle: "Katol Road, Gittikhadan, Nagpur",
    lat: 21.1765,
    lon: 79.0605,
    keywords: ["rcoem", "ramdeobaba", "college", "engineering", "university", "katol", "road"],
  },
  {
    id: "poi_ycce",
    name: "YCCE (Yeshwantrao Chavan College of Engineering)",
    category: "College",
    subtitle: "Wanadongri, Hingna Road, Nagpur",
    lat: 21.0965,
    lon: 78.9790,
    keywords: ["ycce", "yeshwantrao", "chavan", "engineering", "wanadongri", "hingna"],
  },
  {
    id: "poi_raisoni",
    name: "G H Raisoni College of Engineering",
    category: "College",
    subtitle: "CRPF Gate No. 3, Digdoh Hills, Hingna Road",
    lat: 21.1015,
    lon: 78.9865,
    keywords: ["raisoni", "gh", "college", "engineering", "digdoh", "crpf", "hingna"],
  },
  {
    id: "poi_lit",
    name: "Laxminarayan Innovation Tech University (LIT)",
    category: "College",
    subtitle: "Amravati Road, Ram Nagar, Nagpur",
    lat: 21.1475,
    lon: 79.0495,
    keywords: ["lit", "laxminarayan", "technology", "amravati", "road"],
  },
  {
    id: "poi_dharampeth_college",
    name: "Dharampeth Science College",
    category: "College",
    subtitle: "Ambazari Road, Dharampeth, Nagpur",
    lat: 21.1395,
    lon: 79.0558,
    keywords: ["dharampeth", "science", "college"],
  },
  {
    id: "poi_lad_college",
    name: "L.A.D. College for Women",
    category: "College",
    subtitle: "Shankar Nagar Square, Nagpur",
    lat: 21.1370,
    lon: 79.0620,
    keywords: ["lad", "college", "women", "shankar", "nagar"],
  },
  {
    id: "poi_hislop_college",
    name: "Hislop College",
    category: "College",
    subtitle: "Temple Road, Civil Lines, Nagpur",
    lat: 21.1510,
    lon: 79.0735,
    keywords: ["hislop", "college", "civil", "lines"],
  },

  // ─── HOSPITALS ───
  {
    id: "poi_kingsway_hospital",
    name: "Kingsway Hospitals",
    category: "Hospital",
    subtitle: "Near Nagpur Railway Station, Mohan Nagar",
    lat: 21.1555,
    lon: 79.0865,
    keywords: ["kingsway", "hospital", "railway", "station", "mohan", "nagar"],
  },
  {
    id: "poi_max_hospital",
    name: "Max Super Speciality Hospital (Alexis)",
    category: "Hospital",
    subtitle: "Mankapur, Koradi Road, Nagpur",
    lat: 21.1895,
    lon: 79.0810,
    keywords: ["max", "alexis", "hospital", "mankapur", "koradi", "road"],
  },
  {
    id: "poi_care_hospital",
    name: "Care Hospital",
    category: "Hospital",
    subtitle: "Panchsheel Square, Wardha Road, Ramdaspeth",
    lat: 21.1380,
    lon: 79.0790,
    keywords: ["care", "hospital", "panchsheel", "square", "wardha", "road", "ramdaspeth"],
  },
  {
    id: "poi_wockhardt_hospital",
    name: "Wockhardt Super Speciality Hospital",
    category: "Hospital",
    subtitle: "1643, North Ambazari Road, Shankar Nagar",
    lat: 21.1355,
    lon: 79.0625,
    keywords: ["wockhardt", "hospital", "ambazari", "shankar", "nagar"],
  },
  {
    id: "poi_orange_city_hospital",
    name: "Orange City Hospital & Research Institute",
    category: "Hospital",
    subtitle: "Khamla Square, Ring Road, Nagpur",
    lat: 21.1120,
    lon: 79.0620,
    keywords: ["orange", "city", "hospital", "khamla", "square", "ring", "road"],
  },

  // ─── MONUMENTS & TEMPLES ───
  {
    id: "poi_deekshabhoomi",
    name: "Deekshabhoomi Stupa",
    category: "Monument",
    subtitle: "South Ambazari Road, Shraddhanand Peth",
    lat: 21.1275,
    lon: 79.0665,
    keywords: ["deekshabhoomi", "stupa", "buddhist", "ambedkar", "shraddhanand", "peth"],
  },
  {
    id: "poi_dragon_palace",
    name: "Dragon Palace Buddhist Temple",
    category: "Temple",
    subtitle: "Kamptee, North Nagpur",
    lat: 21.2260,
    lon: 79.1985,
    keywords: ["dragon", "palace", "temple", "kamptee", "buddhist", "lotus"],
  },
  {
    id: "poi_koradi_temple",
    name: "Shree Mahalaxmi Jagdamba Temple (Koradi)",
    category: "Temple",
    subtitle: "Koradi, Chhindwara Road, Nagpur",
    lat: 21.2465,
    lon: 79.0970,
    keywords: ["koradi", "temple", "mahalaxmi", "jagdamba", "chhindwara", "road"],
  },
  {
    id: "poi_tekdi_ganesh",
    name: "Shri Ganesh Mandir Tekdi",
    category: "Temple",
    subtitle: "Station Road, Sitabuldi, Nagpur",
    lat: 21.1505,
    lon: 79.0870,
    keywords: ["tekdi", "ganesh", "mandir", "temple", "railway", "station", "sitabuldi"],
  },
  {
    id: "poi_swaminarayan_temple",
    name: "BAPS Shri Swaminarayan Mandir",
    category: "Temple",
    subtitle: "Middle Ring Road, Wathoda Layout, Nagpur",
    lat: 21.1420,
    lon: 79.1510,
    keywords: ["swaminarayan", "mandir", "temple", "baps", "wathoda", "ring", "road"],
  },
  {
    id: "poi_sitabuldi_fort",
    name: "Sitabuldi Fort",
    category: "Monument",
    subtitle: "Sitabuldi Hill, Central Nagpur",
    lat: 21.1470,
    lon: 79.0835,
    keywords: ["sitabuldi", "fort", "military", "british", "hill"],
  },
  {
    id: "poi_zero_mile",
    name: "Zero Mile Stone Monument",
    category: "Monument",
    subtitle: "Wardha Road / Civil Lines, Nagpur",
    lat: 21.1478,
    lon: 79.0805,
    keywords: ["zero", "mile", "stone", "centre", "india", "monument"],
  },

  // ─── TRANSIT HUBS ───
  {
    id: "poi_sitabuldi_interchange",
    name: "Sitabuldi Interchange Metro Station",
    category: "Transit",
    subtitle: "Connecting Blue Line & Orange Line",
    lat: 21.1414,
    lon: 79.0825,
    keywords: ["sitabuldi", "interchange", "metro", "station", "blue", "orange", "junction"],
  },
  {
    id: "poi_nagpur_junction",
    name: "Nagpur Railway Station (Main Junction)",
    category: "Transit",
    subtitle: "Station Road, Central Nagpur",
    lat: 21.1528,
    lon: 79.0886,
    keywords: ["nagpur", "railway", "station", "junction", "train", "central"],
  },
  {
    id: "poi_airport",
    name: "Dr. Babasaheb Ambedkar International Airport",
    category: "Transit",
    subtitle: "Sonegaon, Wardha Road, Nagpur",
    lat: 21.0864,
    lon: 79.0638,
    keywords: ["airport", "international", "flight", "terminal", "sonegaon", "wardha", "road"],
  },
  {
    id: "poi_ganeshpeth_bus_stand",
    name: "Ganeshpeth Central Bus Stand (MSRTC ST Stand)",
    category: "Transit",
    subtitle: "Ganeshpeth Colony, Nagpur",
    lat: 21.1415,
    lon: 79.0965,
    keywords: ["ganeshpeth", "bus", "stand", "msrtc", "st", "intercity"],
  },
  {
    id: "poi_mor_bhavan",
    name: "Mor Bhavan City Bus Stand",
    category: "Transit",
    subtitle: "Sitabuldi, Nagpur",
    lat: 21.1435,
    lon: 79.0795,
    keywords: ["mor", "bhavan", "city", "bus", "stand", "sitabuldi", "aapli"],
  },
  {
    id: "poi_ajni_railway",
    name: "Ajni Railway Station",
    category: "Transit",
    subtitle: "Ajni, South-Central Nagpur",
    lat: 21.1235,
    lon: 79.0820,
    keywords: ["ajni", "railway", "station", "train"],
  },

  // ─── MAJOR LOCALITIES & SQUARES ───
  {
    id: "poi_ramdaspeth",
    name: "Ramdaspeth",
    category: "Locality",
    subtitle: "Central commercial & medical hub, Nagpur",
    lat: 21.1375,
    lon: 79.0730,
    keywords: ["ramdaspeth", "central", "hotels", "hospitals"],
  },
  {
    id: "poi_civil_lines",
    name: "Civil Lines",
    category: "Locality",
    subtitle: "Administrative & green district, Nagpur",
    lat: 21.1550,
    lon: 79.0710,
    keywords: ["civil", "lines", "high", "court", "vidhan", "bhavan", "collector"],
  },
  {
    id: "poi_dhantoli",
    name: "Dhantoli",
    category: "Locality",
    subtitle: "Healthcare & residential area, Nagpur",
    lat: 21.1350,
    lon: 79.0830,
    keywords: ["dhantoli", "hospitals", "mehadia"],
  },
  {
    id: "poi_manish_nagar",
    name: "Manish Nagar",
    category: "Locality",
    subtitle: "Somalwada / Wardha Road corridor, Nagpur",
    lat: 21.0890,
    lon: 79.0780,
    keywords: ["manish", "nagar", "somalwada", "wardha", "road", "railway", "crossing"],
  },
  {
    id: "poi_pratap_nagar",
    name: "Pratap Nagar",
    category: "Locality",
    subtitle: "Ring Road / Khamla, South-West Nagpur",
    lat: 21.1180,
    lon: 79.0530,
    keywords: ["pratap", "nagar", "square", "ring", "road"],
  },
  {
    id: "poi_trimurti_nagar",
    name: "Trimurti Nagar",
    category: "Locality",
    subtitle: "Near Ring Road, South-West Nagpur",
    lat: 21.1135,
    lon: 79.0430,
    keywords: ["trimurti", "nagar", "ring", "road"],
  },
  {
    id: "poi_it_park",
    name: "Nagpur IT Park",
    category: "Locality",
    subtitle: "Gayatri Nagar, South Ambazari Road, Nagpur",
    lat: 21.1215,
    lon: 79.0475,
    keywords: ["it", "park", "gayatri", "nagar", "tcs", "persistant", "tech"],
  },
  {
    id: "poi_mihan_sez",
    name: "MIHAN SEZ",
    category: "Locality",
    subtitle: "Multi-modal International Cargo Hub, Nagpur",
    lat: 21.0250,
    lon: 79.0410,
    keywords: ["mihan", "sez", "infosys", "tcs", "hcl", "cargo", "hub"],
  },
  {
    id: "poi_pardi",
    name: "Pardi",
    category: "Locality",
    subtitle: "Bhandara Road, East Nagpur",
    lat: 21.1497,
    lon: 79.1578,
    keywords: ["pardi", "bhandara", "road", "east", "nagpur"],
  },
  {
    id: "poi_nandanvan",
    name: "Nandanvan",
    category: "Locality",
    subtitle: "East Nagpur",
    lat: 21.1350,
    lon: 79.1280,
    keywords: ["nandanvan", "kdk", "college", "east", "nagpur"],
  },
  {
    id: "poi_manewada",
    name: "Manewada",
    category: "Locality",
    subtitle: "Ring Road, South Nagpur",
    lat: 21.1010,
    lon: 79.1020,
    keywords: ["manewada", "ring", "road", "south", "nagpur"],
  },
  {
    id: "poi_besa",
    name: "Besa",
    category: "Locality",
    subtitle: "South Nagpur corridor",
    lat: 21.0820,
    lon: 79.0980,
    keywords: ["besa", "pipla", "beltarodi", "south"],
  },
  {
    id: "poi_shankar_nagar",
    name: "Shankar Nagar Square",
    category: "Locality",
    subtitle: "West Nagpur",
    lat: 21.1375,
    lon: 79.0635,
    keywords: ["shankar", "nagar", "square", "whc", "road"],
  },
  {
    id: "poi_law_college_sq",
    name: "Law College Square",
    category: "Locality",
    subtitle: "Amravati Road, West Nagpur",
    lat: 21.1460,
    lon: 79.0620,
    keywords: ["law", "college", "square", "amravati", "road"],
  },
  {
    id: "poi_medical_square",
    name: "Medical Square",
    category: "Locality",
    subtitle: "GMC / Rambagh corridor, Nagpur",
    lat: 21.1315,
    lon: 79.0970,
    keywords: ["medical", "square", "gmc", "vr", "mall"],
  },
  {
    id: "poi_vca_stadium",
    name: "VCA Stadium (Vidarbha Cricket Association)",
    category: "Monument",
    subtitle: "Civil Lines & Jamtha, Nagpur",
    lat: 21.1565,
    lon: 79.0775,
    keywords: ["vca", "stadium", "cricket", "civil", "lines", "jamtha"],
  },

  // ─── TECH PARKS & MAJOR OFFICES ───
  {
    id: "poi_infosys_mihan",
    name: "Infosys Nagpur Campus",
    category: "Office",
    subtitle: "MIHAN SEZ, Wardha Road, Nagpur",
    lat: 21.0345,
    lon: 79.0285,
    keywords: ["infosys", "it", "campus", "mihan", "sez", "tech", "software"],
  },
  {
    id: "poi_tcs_mihan",
    name: "TCS (Tata Consultancy Services)",
    category: "Office",
    subtitle: "MIHAN SEZ, Wardha Road, Nagpur",
    lat: 21.0380,
    lon: 79.0315,
    keywords: ["tcs", "tata", "consultancy", "mihan", "sez", "software", "it"],
  },
  {
    id: "poi_hcl_mihan",
    name: "HCL Technologies Campus",
    category: "Office",
    subtitle: "MIHAN SEZ, Nagpur",
    lat: 21.0260,
    lon: 79.0360,
    keywords: ["hcl", "tech", "mihan", "campus", "software"],
  },
  {
    id: "poi_persistent_it_park",
    name: "Persistent Systems (IT Park)",
    category: "Office",
    subtitle: "Gayatri Nagar, South Ambazari Road, Nagpur",
    lat: 21.1225,
    lon: 79.0490,
    keywords: ["persistent", "systems", "it", "park", "gayatri", "nagar"],
  },
  {
    id: "poi_tech_mahindra",
    name: "Tech Mahindra",
    category: "Office",
    subtitle: "MIHAN SEZ, Nagpur",
    lat: 21.0295,
    lon: 79.0340,
    keywords: ["tech", "mahindra", "mihan", "it", "park"],
  },
  {
    id: "poi_rbi_nagpur",
    name: "Reserve Bank of India (RBI)",
    category: "Office",
    subtitle: "RBI Chowk, Civil Lines, Nagpur",
    lat: 21.1518,
    lon: 79.0765,
    keywords: ["rbi", "reserve", "bank", "india", "civil", "lines", "chowk"],
  },
  {
    id: "poi_high_court_nagpur",
    name: "Bombay High Court (Nagpur Bench)",
    category: "Office",
    subtitle: "Civil Lines, Nagpur",
    lat: 21.1555,
    lon: 79.0725,
    keywords: ["high", "court", "bombay", "nagpur", "bench", "civil", "lines", "judiciary"],
  },
  {
    id: "poi_vidhan_bhavan",
    name: "Vidhan Bhavan (Assembly Complex)",
    category: "Office",
    subtitle: "Civil Lines, Nagpur",
    lat: 21.1530,
    lon: 79.0750,
    keywords: ["vidhan", "bhavan", "assembly", "winter", "session", "civil", "lines"],
  },
  {
    id: "poi_collector_office",
    name: "Collector Office & Administrative Complex",
    category: "Office",
    subtitle: "Civil Lines, Nagpur",
    lat: 21.1542,
    lon: 79.0738,
    keywords: ["collector", "office", "collectorate", "revenue", "civil", "lines"],
  },
  {
    id: "poi_nmc_hq",
    name: "Nagpur Municipal Corporation (NMC) HQ",
    category: "Office",
    subtitle: "Mahanagar Palika Marg, Civil Lines, Nagpur",
    lat: 21.1522,
    lon: 79.0780,
    keywords: ["nmc", "municipal", "corporation", "headquarters", "civil", "lines"],
  },

  // ─── HEALTHCARE & HOSPITALS ───
  {
    id: "poi_aiims_nagpur",
    name: "AIIMS Nagpur (All India Institute of Medical Sciences)",
    category: "Hospital",
    subtitle: "MIHAN SEZ, Wardha Road, Nagpur",
    lat: 21.0310,
    lon: 79.0225,
    keywords: ["aiims", "hospital", "medical", "college", "mihan", "wardha", "road"],
  },
  {
    id: "poi_orange_city_hosp",
    name: "Orange City Hospital & Research Institute",
    category: "Hospital",
    subtitle: "Khamla Square, Ring Road, Nagpur",
    lat: 21.1165,
    lon: 79.0585,
    keywords: ["orange", "city", "hospital", "khamla", "square", "ring", "road"],
  },
  {
    id: "poi_wockhardt_hosp",
    name: "Wockhardt Super Speciality Hospital",
    category: "Hospital",
    subtitle: "Near Shankar Nagar Square, Nagpur",
    lat: 21.1360,
    lon: 79.0665,
    keywords: ["wockhardt", "hospital", "shankar", "nagar", "cardiac", "speciality"],
  },
  {
    id: "poi_care_hosp",
    name: "Care Hospitals",
    category: "Hospital",
    subtitle: "Panchsheel Square, Wardha Road, Nagpur",
    lat: 21.1385,
    lon: 79.0830,
    keywords: ["care", "hospital", "panchsheel", "square", "wardha", "road"],
  },
  {
    id: "poi_alexis_hosp",
    name: "Alexis Multi-Speciality Hospital",
    category: "Hospital",
    subtitle: "Mankapur, Koradi Road, Nagpur",
    lat: 21.1875,
    lon: 79.0815,
    keywords: ["alexis", "max", "hospital", "mankapur", "koradi", "road"],
  },
  {
    id: "poi_kingsway_hosp",
    name: "Kingsway Hospitals",
    category: "Hospital",
    subtitle: "Near Nagpur Railway Station, Mohan Nagar",
    lat: 21.1560,
    lon: 79.0875,
    keywords: ["kingsway", "hospital", "railway", "station", "mohan", "nagar"],
  },
  {
    id: "poi_nci_jamtha",
    name: "National Cancer Institute (NCI)",
    category: "Hospital",
    subtitle: "Outer Ring Road, Jamtha, Nagpur",
    lat: 20.9985,
    lon: 79.0210,
    keywords: ["nci", "cancer", "institute", "jamtha", "oncology"],
  },

  // ─── COLLEGES & UNIVERSITIES ───
  {
    id: "poi_vnit_nagpur",
    name: "VNIT (Visvesvaraya National Institute of Technology)",
    category: "College",
    subtitle: "South Ambazari Road, Nagpur",
    lat: 21.1255,
    lon: 79.0515,
    keywords: ["vnit", "engineering", "institute", "technology", "ambazari"],
  },
  {
    id: "poi_iim_nagpur",
    name: "IIM Nagpur (Indian Institute of Management)",
    category: "College",
    subtitle: "MIHAN SEZ, Nagpur",
    lat: 21.0375,
    lon: 79.0245,
    keywords: ["iim", "management", "institute", "mihan"],
  },
  {
    id: "poi_iiit_nagpur",
    name: "IIIT Nagpur (Indian Institute of Information Technology)",
    category: "College",
    subtitle: "Waranga, Butibori / MIHAN corridor",
    lat: 20.9520,
    lon: 79.0125,
    keywords: ["iiit", "information", "technology", "waranga"],
  },
  {
    id: "poi_lit_nagpur",
    name: "Laxminarayan Innovation Technological University (LIT)",
    category: "College",
    subtitle: "Amravati Road, Bharat Nagar, Nagpur",
    lat: 21.1495,
    lon: 79.0490,
    keywords: ["lit", "laxminarayan", "chemical", "engineering", "amravati", "road"],
  },
  {
    id: "poi_rcoem_nagpur",
    name: "Ramdeobaba University (RCOEM / RBU)",
    category: "College",
    subtitle: "Katol Road, Gittikhadan, Nagpur",
    lat: 21.1785,
    lon: 79.0620,
    keywords: ["rcoem", "ramdeobaba", "college", "engineering", "katol", "road", "rbu"],
  },
  {
    id: "poi_ycce_hingna",
    name: "Yashwantrao Chavan College of Engineering (YCCE)",
    category: "College",
    subtitle: "Wanadongri, Hingna Road, Nagpur",
    lat: 21.0965,
    lon: 78.9790,
    keywords: ["ycce", "engineering", "wanadongri", "hingna", "meghe"],
  },
  {
    id: "poi_ghrce_nagpur",
    name: "G.H. Raisoni College of Engineering (GHRCE)",
    category: "College",
    subtitle: "CRPF Gate No. 3, Digdoh Hills, Hingna Road",
    lat: 21.1030,
    lon: 78.9860,
    keywords: ["raisoni", "ghrce", "engineering", "digdoh", "hingna", "crpf"],
  },
  {
    id: "poi_pce_hingna",
    name: "Priyadarshini College of Engineering (PCE)",
    category: "College",
    subtitle: "Near CRPF Campus, Digdoh Hills, Hingna Road",
    lat: 21.1060,
    lon: 78.9915,
    keywords: ["priyadarshini", "pce", "engineering", "digdoh", "hingna"],
  },
  {
    id: "poi_hislop_college",
    name: "Hislop College",
    category: "College",
    subtitle: "Temple Road, Civil Lines, Nagpur",
    lat: 21.1510,
    lon: 79.0715,
    keywords: ["hislop", "college", "arts", "science", "civil", "lines"],
  },
  {
    id: "poi_lad_college",
    name: "LAD & SRP College for Women",
    category: "College",
    subtitle: "Shankar Nagar / Seminary Hills, Nagpur",
    lat: 21.1390,
    lon: 79.0625,
    keywords: ["lad", "college", "women", "shankar", "nagar"],
  },
  {
    id: "poi_sibm_wathoda",
    name: "Symbiosis Institute (SIBM / SLS Nagpur)",
    category: "College",
    subtitle: "Ghat Road, Wathoda Layout, East Nagpur",
    lat: 21.1275,
    lon: 79.1620,
    keywords: ["symbiosis", "sibm", "sls", "law", "management", "wathoda"],
  },

  // ─── FAMOUS RESTAURANTS & FOOD HUBS ───
  {
    id: "poi_haldirams_shankar_nagar",
    name: "Haldiram's Planet Food",
    category: "Restaurant",
    subtitle: "Shankar Nagar Square, WHC Road, Nagpur",
    lat: 21.1378,
    lon: 79.0638,
    keywords: ["haldiram", "planet", "food", "shankar", "nagar", "sweets", "restaurant"],
  },
  {
    id: "poi_haldirams_sadar",
    name: "Haldiram's Sweets & Restaurant",
    category: "Restaurant",
    subtitle: "Residency Road, Sadar, Nagpur",
    lat: 21.1605,
    lon: 79.0825,
    keywords: ["haldiram", "sadar", "residency", "road", "sweets", "chaat"],
  },
  {
    id: "poi_haldirams_sitabuldi",
    name: "Haldiram's Thhat Baat",
    category: "Restaurant",
    subtitle: "Abhyankar Marg, Sitabuldi, Nagpur",
    lat: 21.1440,
    lon: 79.0810,
    keywords: ["haldiram", "thhat", "baat", "sitabuldi", "dining", "thali"],
  },
  {
    id: "poi_dinshaws_gittikhadan",
    name: "Dinshaw's Ice Cream Factory & Parlour",
    category: "Restaurant",
    subtitle: "Gittikhadan, Katol Road, Nagpur",
    lat: 21.1725,
    lon: 79.0560,
    keywords: ["dinshaw", "ice", "cream", "factory", "gittikhadan", "dessert"],
  },
  {
    id: "poi_shabana_bakery",
    name: "Shabana Bakery & Cafe",
    category: "Restaurant",
    subtitle: "Mount Road Extension, Sadar, Nagpur",
    lat: 21.1645,
    lon: 79.0835,
    keywords: ["shabana", "bakery", "sadar", "pastry", "cakes"],
  },
  {
    id: "poi_taubys_ramdaspeth",
    name: "Tauby's Cafe & Bakery",
    category: "Restaurant",
    subtitle: "Central Bazaar Road, Ramdaspeth, Nagpur",
    lat: 21.1340,
    lon: 79.0745,
    keywords: ["tauby", "bakery", "cafe", "ramdaspeth", "coffee"],
  },
  {
    id: "poi_barbeque_nation_sadar",
    name: "Barbeque Nation",
    category: "Restaurant",
    subtitle: "Eternity Mall & Mount Road, Sadar, Nagpur",
    lat: 21.1578,
    lon: 79.0832,
    keywords: ["barbeque", "nation", "buffet", "sadar", "grill", "bbq"],
  },
  {
    id: "poi_vishnuji_ki_rasoi",
    name: "Vishnuji Ki Rasoi",
    category: "Restaurant",
    subtitle: "Near Bajaj Nagar Water Tank, Central Nagpur",
    lat: 21.1245,
    lon: 79.0680,
    keywords: ["vishnuji", "ki", "rasoi", "bajaj", "nagar", "thali", "maharashtrian", "buffet"],
  },
  {
    id: "poi_saoji_bhojnalaya_umred",
    name: "Pardhi Saoji Bhojnalaya",
    category: "Restaurant",
    subtitle: "Umred Road, Dighori, Nagpur",
    lat: 21.1180,
    lon: 79.1320,
    keywords: ["saoji", "pardhi", "spicy", "nagpur", "umred", "road", "dighori"],
  },
  {
    id: "poi_jagdish_saoji",
    name: "Jagdish Saoji Family Restaurant",
    category: "Restaurant",
    subtitle: "Gandhibagh / Itwari, Central Nagpur",
    lat: 21.1510,
    lon: 79.1120,
    keywords: ["jagdish", "saoji", "gandhibagh", "itwari", "spicy", "mutton"],
  },
  {
    id: "poi_the_breakfast_story",
    name: "The Breakfast Story",
    category: "Restaurant",
    subtitle: "Hingna Road, Trimurti Nagar, Nagpur",
    lat: 21.1190,
    lon: 79.0395,
    keywords: ["breakfast", "story", "hingna", "trimurti", "nagar", "cafe", "waffles"],
  },
  {
    id: "poi_veeraswami_sadar",
    name: "Veeraswami South Indian Restaurant",
    category: "Restaurant",
    subtitle: "Mount Road, Sadar, Nagpur",
    lat: 21.1592,
    lon: 79.0840,
    keywords: ["veeraswami", "south", "indian", "dosa", "idli", "sadar", "filter", "coffee"],
  },
  {
    id: "poi_gokul_vrindavan_dharampeth",
    name: "Gokul Vrindavan Restaurant",
    category: "Restaurant",
    subtitle: "WHC Road, Dharampeth, Nagpur",
    lat: 21.1402,
    lon: 79.0610,
    keywords: ["gokul", "vrindavan", "dharampeth", "veg", "thali", "dosa", "sweets"],
  },
  {
    id: "poi_corridor_seven_coffee",
    name: "Corridor Seven Coffee Roasters",
    category: "Restaurant",
    subtitle: "Temple Road, Civil Lines / Ramdaspeth, Nagpur",
    lat: 21.1350,
    lon: 79.0715,
    keywords: ["corridor", "seven", "coffee", "roasters", "cafe", "ramdaspeth", "espresso"],
  },
  {
    id: "poi_gmch_nagpur",
    name: "Government Medical College & Hospital (GMCH)",
    category: "Hospital",
    subtitle: "Medical Square, Untkhana, South-Central Nagpur",
    lat: 21.1315,
    lon: 79.0965,
    keywords: ["gmch", "government", "medical", "college", "hospital", "untkhana", "emergency"],
  },
  {
    id: "poi_mayo_hospital",
    name: "Indira Gandhi Govt Medical College (Mayo Hospital)",
    category: "Hospital",
    subtitle: "Central Avenue, Near Railway Station, Mominpura, Nagpur",
    lat: 21.1525,
    lon: 79.0980,
    keywords: ["mayo", "igmch", "government", "hospital", "central", "avenue", "mominpura"],
  },
  {
    id: "poi_sevenstar_hospital",
    name: "SevenStar Hospital",
    category: "Hospital",
    subtitle: "Jagnade Chowk, Great Nag Road, Nandanvan, Nagpur",
    lat: 21.1340,
    lon: 79.1170,
    keywords: ["sevenstar", "hospital", "jagnade", "chowk", "great", "nag", "road", "nandanvan"],
  },
  {
    id: "poi_lata_mangeshkar_hingna",
    name: "Lata Mangeshkar Hospital (NKP SIMS)",
    category: "Hospital",
    subtitle: "Digdoh Hills, Hingna Road, West Nagpur",
    lat: 21.1015,
    lon: 78.9890,
    keywords: ["lata", "mangeshkar", "hospital", "nkpsims", "hingna", "digdoh", "medical"],
  },
  {
    id: "poi_lata_mangeshkar_sitabuldi",
    name: "Lata Mangeshkar Hospital (Sitabuldi)",
    category: "Hospital",
    subtitle: "Maharaja Bagh Road, Sitabuldi, Nagpur",
    lat: 21.1445,
    lon: 79.0760,
    keywords: ["lata", "mangeshkar", "hospital", "sitabuldi", "maharaja", "bagh"],
  },
  {
    id: "poi_crescent_hospital",
    name: "Crescent Hospital & Heart Centre",
    category: "Hospital",
    subtitle: "Near Mehadia Square, Dhantoli, Nagpur",
    lat: 21.1330,
    lon: 79.0835,
    keywords: ["crescent", "hospital", "heart", "cardiac", "dhantoli", "mehadia"],
  },
  {
    id: "poi_spandan_heart_institute",
    name: "Spandan Heart Institute & Research Center",
    category: "Hospital",
    subtitle: "Wardha Road, Dhantoli, Nagpur",
    lat: 21.1350,
    lon: 79.0815,
    keywords: ["spandan", "heart", "institute", "cardiology", "dhantoli", "wardha", "road"],
  },
  {
    id: "poi_krims_hospital",
    name: "KRIMS Hospitals",
    category: "Hospital",
    subtitle: "Central Bazaar Road, Ramdaspeth, Nagpur",
    lat: 21.1335,
    lon: 79.0730,
    keywords: ["krims", "hospital", "ramdaspeth", "pulmonary", "multi", "speciality"],
  },
  {
    id: "poi_aureus_hospital",
    name: "Aureus Multi-Speciality Hospital",
    category: "Hospital",
    subtitle: "Wanjari Nagar, Medical Square, Nagpur",
    lat: 21.1235,
    lon: 79.1020,
    keywords: ["aureus", "hospital", "wanjari", "nagar", "medical", "square", "emergency"],
  },
  {
    id: "poi_hope_hospital",
    name: "Hope Hospital",
    category: "Hospital",
    subtitle: "Teka Naka, Kamptee Road, North Nagpur",
    lat: 21.1915,
    lon: 79.1120,
    keywords: ["hope", "hospital", "teka", "naka", "kamptee", "road"],
  },
  {
    id: "poi_sengupta_hospital",
    name: "Sengupta Hospital & Research Institute",
    category: "Hospital",
    subtitle: "Near Ravi Nagar Square, West High Court Road, Nagpur",
    lat: 21.1505,
    lon: 79.0550,
    keywords: ["sengupta", "hospital", "ravi", "nagar", "whc", "road"],
  },

  // ─── MAJOR SHOPS, RETAIL & MARKETS ───
  {
    id: "poi_dmart_hingna",
    name: "D-Mart Supermarket (Hingna Road)",
    category: "Shop",
    subtitle: "Near Subhash Nagar Metro, Hingna Road, Nagpur",
    lat: 21.1210,
    lon: 79.0345,
    keywords: ["dmart", "supermarket", "grocery", "shopping", "hingna", "road"],
  },
  {
    id: "poi_dmart_besa",
    name: "D-Mart Supermarket (Besa / Manewada)",
    category: "Shop",
    subtitle: "Besa-Ghogli Road, South Nagpur",
    lat: 21.0835,
    lon: 79.1025,
    keywords: ["dmart", "besa", "manewada", "supermarket", "grocery"],
  },
  {
    id: "poi_zudio_sadar",
    name: "Zudio Fashion Store",
    category: "Shop",
    subtitle: "Residency Road, Sadar, Nagpur",
    lat: 21.1590,
    lon: 79.0818,
    keywords: ["zudio", "fashion", "clothes", "sadar", "tata", "apparel"],
  },
  {
    id: "poi_zudio_dharampeth",
    name: "Zudio Fashion (Dharampeth)",
    category: "Shop",
    subtitle: "WHC Road, Dharampeth, Nagpur",
    lat: 21.1415,
    lon: 79.0595,
    keywords: ["zudio", "dharampeth", "whc", "fashion", "shopping"],
  },
  {
    id: "poi_sarafa_bazaar",
    name: "Sarafa Gold & Jewelry Bazaar",
    category: "Shop",
    subtitle: "Itwari, Central Nagpur",
    lat: 21.1545,
    lon: 79.1140,
    keywords: ["sarafa", "bazaar", "gold", "jewelry", "itwari", "market"],
  },
  {
    id: "poi_gandhibagh_cloth",
    name: "Gandhibagh Wholesale Textile Market",
    category: "Shop",
    subtitle: "Central Avenue, Gandhibagh, Nagpur",
    lat: 21.1495,
    lon: 79.1065,
    keywords: ["gandhibagh", "cloth", "textile", "market", "wholesale", "central", "avenue"],
  },
  {
    id: "poi_cotton_market",
    name: "Cotton Market (Subhash Vegetable Market)",
    category: "Shop",
    subtitle: "Near Railway Station, Central Nagpur",
    lat: 21.1470,
    lon: 79.0910,
    keywords: ["cotton", "market", "vegetables", "fruits", "subhash", "railway"],
  },
  {
    id: "poi_kalamna_market",
    name: "Kalamna APMC Market (Grain & Chilli Yard)",
    category: "Shop",
    subtitle: "Kalamna, East Nagpur",
    lat: 21.1685,
    lon: 79.1460,
    keywords: ["kalamna", "apmc", "market", "grain", "chilli", "yard", "wholesale"],
  },
];

export interface NearbyPoiResult {
  id: string;
  name: string;
  category: "Restaurant" | "Hospital" | string;
  subtitle: string;
  lat: number;
  lon: number;
  distM: number;
  rating?: number | undefined;
  userRatingCount?: number | undefined;
}

/**
 * Calculates Haversine distance in meters between two lat/lon coordinates.
 */
export function calcDistanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the nearest POIs (restaurants or hospitals) from a given reference lat/lon (local static index).
 * Returns sorted list by straight-line distance.
 */
export function findNearestPOIs(
  refLat: number,
  refLon: number,
  category: "Restaurant" | "Hospital",
  limit = 20
): NearbyPoiResult[] {
  if (typeof refLat !== "number" || isNaN(refLat) || typeof refLon !== "number" || isNaN(refLon)) {
    // Default to Nagpur central coordinate if invalid
    refLat = 21.1458;
    refLon = 79.0882;
  }

  const matches: NearbyPoiResult[] = [];
  const seenIds = new Set<string>();

  for (const poi of NAGPUR_POIS) {
    if (poi.category.toLowerCase() === category.toLowerCase() && !seenIds.has(poi.id)) {
      seenIds.add(poi.id);
      const distM = calcDistanceM(refLat, refLon, poi.lat, poi.lon);
      matches.push({
        id: poi.id,
        name: poi.name,
        category: poi.category,
        subtitle: poi.subtitle,
        lat: poi.lat,
        lon: poi.lon,
        distM,
      });
    }
  }

  // Sort by closest distance first
  matches.sort((a, b) => a.distM - b.distM);

  return matches.slice(0, limit);
}

/**
 * Fetches accurate, live, real-world Restaurants and Hospitals across Nagpur using Google Places API (New).
 * Falls back cleanly to local curated index if API is unavailable or offline.
 */
export async function fetchLiveNearbyPOIs(
  refLat: number,
  refLon: number,
  category: "Restaurant" | "Hospital",
  limit = 20,
  signal?: AbortSignal
): Promise<NearbyPoiResult[]> {
  const safeLat = typeof refLat === "number" && !isNaN(refLat) ? refLat : 21.1458;
  const safeLon = typeof refLon === "number" && !isNaN(refLon) ? refLon : 79.0882;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return findNearestPOIs(safeLat, safeLon, category, limit);
  }

  const typeMap: Record<string, string[]> = {
    Restaurant: ["restaurant", "fast_food_restaurant", "cafe", "bakery", "indian_restaurant"],
    Hospital: ["hospital", "medical_clinic", "doctor", "pharmacy"],
  };

  const includedTypes = typeMap[category] || ["restaurant"];
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  try {
    const res = await fetch(url, {
      ...(signal ? { signal } : {}),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey.trim(),
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount",
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: Math.min(limit, 20),
        locationRestriction: {
          circle: {
            center: { latitude: safeLat, longitude: safeLon },
            radius: 8000.0, // 8km radius around search origin
          },
        },
      }),
    });

    if (!res.ok) {
      return findNearestPOIs(safeLat, safeLon, category, limit);
    }

    const data = (await res.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
        rating?: number;
        userRatingCount?: number;
      }>;
    };

    if (!data.places || !data.places.length) {
      return findNearestPOIs(safeLat, safeLon, category, limit);
    }

    const results: NearbyPoiResult[] = [];
    const seenIds = new Set<string>();

    for (const p of data.places) {
      const lat = p.location?.latitude;
      const lon = p.location?.longitude;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      // Ensure within Greater Nagpur metropolitan area
      if (lat < 20.65 || lat > 21.65 || lon < 78.4 || lon > 79.7) continue;

      const id = p.id || `google_${lat.toFixed(5)}_${lon.toFixed(5)}`;
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const distM = calcDistanceM(safeLat, safeLon, lat, lon);
      results.push({
        id,
        name: p.displayName?.text || (category === "Restaurant" ? "Restaurant" : "Hospital"),
        category,
        subtitle: p.formattedAddress || "Nagpur, Maharashtra",
        lat,
        lon,
        distM,
        rating: p.rating,
        userRatingCount: p.userRatingCount,
      });
    }

    // Sort strictly by closest distance first
    results.sort((a, b) => a.distM - b.distM);

    if (results.length > 0) {
      return results.slice(0, limit);
    }

    return findNearestPOIs(safeLat, safeLon, category, limit);
  } catch {
    return findNearestPOIs(safeLat, safeLon, category, limit);
  }
}

/**
 * Fetches 40–60+ Restaurants or Hospitals across all of Nagpur (Multi-Zone Grid Search).
 * Simultaneously covers Central, West, East, South, and North Nagpur in parallel.
 */
export async function fetchNagpurWidePOIs(
  refLat: number,
  refLon: number,
  category: "Restaurant" | "Hospital",
  signal?: AbortSignal
): Promise<NearbyPoiResult[]> {
  const safeLat = typeof refLat === "number" && !isNaN(refLat) ? refLat : 21.1458;
  const safeLon = typeof refLon === "number" && !isNaN(refLon) ? refLon : 79.0882;

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return findNearestPOIs(safeLat, safeLon, category, 40);
  }

  const typeMap: Record<string, string[]> = {
    Restaurant: ["restaurant", "fast_food_restaurant", "cafe", "bakery", "indian_restaurant"],
    Hospital: ["hospital", "medical_clinic", "doctor", "pharmacy"],
  };

  const includedTypes = typeMap[category] || ["restaurant"];
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  // 13 Strategic Nagpur Hubs covering the entire metropolitan region (Central, MIHAN, Ajni, East, West, North, South)
  const zones = [
    { name: "User / Selected Center", lat: safeLat, lon: safeLon },
    { name: "Central (Sitabuldi / Dharampeth)", lat: 21.1458, lon: 79.0750 },
    { name: "Ajni / Dhantoli / Medical Square", lat: 21.1250, lon: 79.0850 },
    { name: "MIHAN / AIIMS / Khapri (Airport South)", lat: 21.0350, lon: 79.0550 },
    { name: "Manish Nagar / Besa / Somalwada", lat: 21.0850, lon: 79.0950 },
    { name: "East (Itwari / Mahal / Gandhibagh)", lat: 21.1450, lon: 79.1150 },
    { name: "East (Nandanvan / Dighori / Kharbi)", lat: 21.1200, lon: 79.1350 },
    { name: "South-West (Trimurti Nagar / Pratap Nagar / Khamla)", lat: 21.1100, lon: 79.0450 },
    { name: "West (Hingna / MIDC / Wanadongri / Digdoh)", lat: 21.0950, lon: 78.9950 },
    { name: "West (Wadi / Duttawadi / Amravati Road)", lat: 21.1500, lon: 79.0050 },
    { name: "North-West (Sadar / Civil Lines / Katol Road)", lat: 21.1650, lon: 79.0750 },
    { name: "North (Mankapur / Koradi / Jaripatka)", lat: 21.1950, lon: 79.0900 },
    { name: "North-East (Kamptee Road / Pardi / Kalamna)", lat: 21.1850, lon: 79.1550 },
  ];

  try {
    const promises = zones.map(async (z) => {
      try {
        const res = await fetch(url, {
          ...(signal ? { signal } : {}),
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey.trim(),
            "X-Goog-FieldMask":
              "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.userRatingCount",
          },
          body: JSON.stringify({
            includedTypes,
            maxResultCount: 20,
            locationRestriction: {
              circle: {
                center: { latitude: z.lat, longitude: z.lon },
                radius: 6500.0,
              },
            },
          }),
        });
        if (!res.ok) return [];
        const data = (await res.json()) as {
          places?: Array<{
            id?: string;
            displayName?: { text?: string };
            formattedAddress?: string;
            location?: { latitude?: number; longitude?: number };
            rating?: number;
            userRatingCount?: number;
          }>;
        };
        return data.places || [];
      } catch {
        return [];
      }
    });

    const rawGroups = await Promise.all(promises);
    const seenIds = new Set<string>();
    const combined: NearbyPoiResult[] = [];

    for (const group of rawGroups) {
      for (const p of group) {
        const lat = p.location?.latitude;
        const lon = p.location?.longitude;
        if (typeof lat !== "number" || typeof lon !== "number") continue;
        if (lat < 20.65 || lat > 21.65 || lon < 78.4 || lon > 79.7) continue;

        const id = p.id || `google_${lat.toFixed(5)}_${lon.toFixed(5)}`;
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        const distM = calcDistanceM(safeLat, safeLon, lat, lon);
        combined.push({
          id,
          name: p.displayName?.text || (category === "Restaurant" ? "Restaurant" : "Hospital"),
          category,
          subtitle: p.formattedAddress || "Nagpur, Maharashtra",
          lat,
          lon,
          distM,
          rating: p.rating,
          userRatingCount: p.userRatingCount,
        });
      }
    }

    combined.sort((a, b) => a.distM - b.distM);

    if (combined.length > 0) {
      return combined;
    }

    return findNearestPOIs(safeLat, safeLon, category, 40);
  } catch {
    return findNearestPOIs(safeLat, safeLon, category, 40);
  }
}

