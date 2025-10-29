export const categoryMap: Record<
  string,
  {
    category_ids: number[];
    fuzzy_keywords: Record<string, number>;
  }
> = {
  "Women's Clothing": {
    category_ids: [20924, 102325, 102326, 20925, 20926, 20927],
    fuzzy_keywords: {
      dress: 20924,
      blouse: 102325,
      skirt: 102326,
      top: 102325,
      jumpsuit: 20925,
      playsuit: 20925,
      tunic: 102325,
      gown: 20924,
      lingerie: 20926,
      nightwear: 20926,
      swimsuit: 20927,
      bikini: 20927,
      maternity: 20924,
      hoodie: 102326,
      sweatshirt: 102326,
    },
  },
  "Men's Clothing": {
    category_ids: [88740, 179691, 88741, 88742, 179692],
    fuzzy_keywords: {
      shirt: 88741,
      trouser: 179691,
      jeans: 179691,
      jacket: 88742,
      coat: 88742,
      tshirt: 88741,
      polo: 88741,
      jumper: 179692,
      waistcoat: 179692,
      blazer: 88740,
      suit: 88740,
      short: 179692,
      gilet: 179692,
    },
  },
  "Women's Shoes": {
    category_ids: [164795, 98968, 164796, 98972],
    fuzzy_keywords: {
      shoe: 164795,
      boot: 164796,
      trainer: 98972,
      heel: 98968,
      sandal: 98968,
      slipper: 98972,
    },
  },
  'Bags & Handbags': {
    category_ids: [164797, 164798, 164799, 164800],
    fuzzy_keywords: {
      handbag: 164797,
      purse: 164799,
      wallet: 164798,
    },
  },
  "Men's Accessories": {
    category_ids: [4250, 4251, 4252],
    fuzzy_keywords: {
      belt: 4250,
      tie: 4251,
      hat: 4252,
    },
  },
  "Women's Accessories": {
    category_ids: [4253, 4254, 4255],
    fuzzy_keywords: {
      scarf: 4253,
      glove: 4254,
      hat: 4255,
    },
  },
  'Jewellery & Watches': {
    category_ids: [116098, 116099, 116100, 20929],
    fuzzy_keywords: {
      ring: 116098,
      necklace: 116099,
      bracelet: 116100,
      earring: 116100,
      brooch: 20929,
      pendant: 116099,
      watch: 20929,
      jewellery: 116098,
    },
  },
  Books: {
    category_ids: [37565, 37566, 37567, 37568],
    fuzzy_keywords: {
      book: 37565,
      comic: 37566,
      magazine: 37567,
      novel: 37565,
      story: 37565,
    },
  },
  'Cameras & Photography': {
    category_ids: [171826, 171831, 171813, 171814],
    fuzzy_keywords: {
      camera: 171826,
      lens: 171831,
      tripod: 171813,
      photography: 171814,
    },
  },
  'Computers & Tablets': {
    category_ids: [58058, 175673, 177],
    fuzzy_keywords: {
      laptop: 58058,
      tablet: 175673,
      pc: 177,
    },
  },
  'Mobile Phones': {
    category_ids: [9355],
    fuzzy_keywords: {
      phone: 9355,
      iphone: 9355,
      android: 9355,
    },
  },
  'Video Games & Consoles': {
    category_ids: [139973, 139971, 139972],
    fuzzy_keywords: {
      console: 139973,
      game: 139972,
      playstation: 139971,
      xbox: 139971,
      nintendo: 139971,
    },
  },
  'Sound & Vision': {
    category_ids: [293, 172176, 15052],
    fuzzy_keywords: {
      headphone: 293,
      speaker: 15052,
      tv: 172176,
    },
  },
  Furniture: {
    category_ids: [171858, 117042, 171898],
    fuzzy_keywords: {
      sofa: 171858,
      chair: 117042,
      table: 171898,
      cupboard: 171898,
      drawer: 171898,
      bed: 171858,
    },
  },
  'Rugs & Carpets': {
    category_ids: [20571],
    fuzzy_keywords: {
      rug: 20571,
      carpet: 20571,
    },
  },
  Lighting: {
    category_ids: [20697],
    fuzzy_keywords: {
      lamp: 20697,
    },
  },
  'Home Décor': {
    category_ids: [171820, 171821, 172510],
    fuzzy_keywords: {
      cushion: 171820,
      curtain: 171821,
      mirror: 172510,
      bedding: 171820,
      vase: 171820,
      candle: 172510,
    },
  },
  'Cookware & Dining': {
    category_ids: [20625, 20627],
    fuzzy_keywords: {
      mug: 20625,
      plate: 20627,
      glass: 20625,
      fork: 20627,
      spoon: 20627,
      knife: 20627,
    },
  },
  'Health & Beauty': {
    category_ids: [182174, 182175],
    fuzzy_keywords: {
      perfume: 182174,
      lotion: 182175,
      cream: 182175,
      shampoo: 182175,
      soap: 182175,
    },
  },
  'Toys & Games': {
    category_ids: [3256, 29579, 183477],
    fuzzy_keywords: {
      toy: 3256,
      teddy: 183477,
      puzzle: 29579,
      gameboard: 29579,
    },
  },
  'Sporting Goods': {
    category_ids: [50355, 50356, 50357, 50358],
    fuzzy_keywords: {
      bike: 50355,
      football: 50356,
      racket: 50357,
    },
  },
  'Musical Instruments': {
    category_ids: [619, 10181],
    fuzzy_keywords: {
      guitar: 619,
      violin: 10181,
      keyboard: 10181,
    },
  },
  Art: {
    category_ids: [37559, 37560, 37561],
    fuzzy_keywords: {
      paint: 37559,
      artwork: 37560,
      canvas: 37561,
    },
  },
  'Coins & Stamps': {
    category_ids: [11116, 260],
    fuzzy_keywords: {
      coin: 11116,
      stamp: 260,
    },
  },
  Antiques: {
    category_ids: [20081],
    fuzzy_keywords: {
      antique: 20081,
    },
  },
  Collectables: {
    category_ids: [1],
    fuzzy_keywords: {
      collectible: 1,
    },
  },
};
