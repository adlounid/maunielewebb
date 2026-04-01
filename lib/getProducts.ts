export interface Product {
  id: string;
  name: string;
  price: number;
  category: "Dam" | "Herr";
  rating: number;
  image: string;
  tagline: string;
  shortDesc: string;
  description: string;
  notes: string[];
}

export const PRODUCTS: Product[] = [
  {
    id: "cherry-fusion",
    name: "Cherry Fusion",
    price: 349,
    category: "Dam",
    rating: 4.8,
    image: "/cherry.webp",
    tagline: "Inspirerad av Tom Ford Lost Cherry",
    shortDesc: "Saftiga körsbär, mörk sötma och varm elegans i en signaturdoft som stannar kvar.",
    description:
      "Cherry Fusion öppnar med svartkörsbär och bittermandel, går över i ett sensuellt blommande hjärta och landar i en varm bas av tonkaböna och cederträ.",
    notes: ["Svartkörsbär", "Bittermandel", "Jasmin", "Turkisk ros", "Perubalsam", "Tonkaböna"],
  },
  {
    id: "tobacco-angels",
    name: "Tobacco Angels",
    price: 349,
    category: "Herr",
    rating: 4.7,
    image: "/tobako.webp",
    tagline: "Inspirerad av Initio Side Effect",
    shortDesc: "Kryddig värme med rom, saffran och tobak för en djup och beroendeframkallande känsla.",
    description:
      "Tobacco Angels blandar kanel, rom och vanilj med ett mörkt tobaksdjup som känns både lyxigt och självsäkert.",
    notes: ["Kanel", "Rom", "Vanilj", "Saffran", "Tobak", "Sandelträ"],
  },
  {
    id: "almond-vanille",
    name: "Almond Vanille",
    price: 349,
    category: "Herr",
    rating: 4.6,
    image: "/tonka.jpg",
    tagline: "Inspirerad av Jo Malone Myrrh & Tonka",
    shortDesc: "Mjuk myrra, lavendel och vanilj som ger ett varmt, elegant och omslutande intryck.",
    description:
      "Almond Vanille är en varm och sofistikerad doft där aromatisk lavendel möter resinös myrra och en mjuk gourmandbas.",
    notes: ["Lavendel", "Myrra", "Tonkaböna", "Mandel", "Vanilj"],
  },
  {
    id: "dark-wood",
    name: "Dark Wood",
    price: 349,
    category: "Herr",
    rating: 4.7,
    image: "/dark.webp",
    tagline: "Inspirerad av Tom Ford Oud Wood",
    shortDesc: "Träig och mystisk med oud, kardemumma och varm amber i ett kraftfullt uttryck.",
    description:
      "Dark Wood är byggd kring kryddiga tränoter, oud och vanilj för ett mörkt men polerat doftspår.",
    notes: ["Rosenträ", "Peppar", "Kardemumma", "Oud", "Vetiver", "Amber"],
  },
  {
    id: "de-valmont",
    name: "De Valmont",
    price: 349,
    category: "Herr",
    rating: 4.6,
    image: "/da.webp",
    tagline: "Inspirerad av Althair de Marly",
    shortDesc: "Frisk kryddighet som möter vanilj, amber och pralin i en modern herrfavorit.",
    description:
      "De Valmont öppnar ljust med bergamott och apelsinblom, rundas av med vanilj och får djup genom amber och trä.",
    notes: ["Apelsinblom", "Bergamott", "Kanel", "Vanilj", "Amber", "Pralin"],
  },
  {
    id: "vanilla-candy",
    name: "Vanilla Candy",
    price: 349,
    category: "Dam",
    rating: 4.6,
    image: "/candy.webp",
    tagline: "Inspirerad av Kayali Vanilla Candy Rock Sugar",
    shortDesc: "Lekfull gourmand med päron, vaniljkräm och tonkaböna som smälter in i huden.",
    description:
      "Vanilla Candy är mjuk, söt och flirtig med ett krämigt vaniljhjärta och en varm, hudnära avslutning.",
    notes: ["Kanderat päron", "Vaniljkräm", "Tuggummi", "Jasmin", "Tonkaböna", "Sandelträ"],
  },
  {
    id: "golden-bloom",
    name: "Golden Bloom",
    price: 349,
    category: "Dam",
    rating: 4.7,
    image: "/gold.jpg",
    tagline: "Inspirerad av Chanel Mademoiselle",
    shortDesc: "En strålande blomdoft med citrus, ros och vit mysk som känns både klassisk och modern.",
    description:
      "Golden Bloom utvecklas från friska citrusnoter till ett varmt blommande hjärta och en mjuk, gyllene bas.",
    notes: ["Apelsin", "Mandarin", "Jasmin", "Ros", "Patchouli", "Vit mysk"],
  },
];

export function getProducts() {
  return PRODUCTS;
}

export function getProductMap() {
  return new Map(PRODUCTS.map((product) => [product.id, product]));
}
