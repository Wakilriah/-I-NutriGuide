from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.nutrients.models import Nutrient, NutrientIntakeReference
from apps.supplements.models import (
    Supplement,
    SupplementAlias,
    SupplementSafetyRule,
)


NIH_ODS = "https://ods.od.nih.gov/factsheets/list-all/"
NCCIH = "https://www.nccih.nih.gov/health/herbsataglance"
MEDLINEPLUS = "https://medlineplus.gov/druginformation.html"


SUPPLEMENTS = [
    ("Magnesium", "mineral", "NIH ODS", NIH_ODS, ["Mg", "magnesium citrate", "magnesium glycinate", "magnesium oxide", "magnesium malate"]),
    ("Zinc", "mineral", "NIH ODS", NIH_ODS, ["Zn", "zinc gluconate", "zinc picolinate", "zinc citrate", "zinc acetate"]),
    ("Omega-3 Fatty Acids", "fatty acid", "NIH ODS", NIH_ODS, ["omega 3", "fish oil", "EPA DHA", "marine omega-3", "alpha-linolenic acid"]),
    ("Creatine", "sports nutrition", "MedlinePlus", MEDLINEPLUS, ["creatine monohydrate", "creatine HCL", "creatine powder", "creatine supplement", "methylguanidine-acetic acid"]),
    ("Melatonin", "sleep support", "NCCIH", NCCIH, ["sleep hormone", "melatonin gummies", "melatonin tablets", "nighttime supplement", "N-acetyl-5-methoxytryptamine"]),
    ("Ashwagandha", "botanical", "NCCIH", NCCIH, ["withania somnifera", "indian ginseng", "winter cherry", "ashwaganda", "ashwagandha root"]),
    ("Turmeric", "botanical", "NCCIH", NCCIH, ["curcumin", "curcuma longa", "turmeric extract", "turmeric root", "curcuminoids"]),
    ("Coenzyme Q10", "compound", "MedlinePlus", MEDLINEPLUS, ["CoQ10", "ubiquinone", "ubiquinol", "co q 10", "coenzyme q-10"]),
    ("Probiotics", "microbiome", "NIH ODS", NIH_ODS, ["lactobacillus", "bifidobacterium", "friendly bacteria", "gut flora", "probiotic blend"]),
    ("Berberine", "botanical compound", "MedlinePlus", MEDLINEPLUS, ["berberine HCL", "barberry extract", "berberis", "goldenseal alkaloid", "berberine chloride"]),
    ("Collagen", "protein", "MedlinePlus", MEDLINEPLUS, ["collagen peptides", "hydrolyzed collagen", "marine collagen", "bovine collagen", "collagen powder"]),
    ("N-Acetyl Cysteine", "amino acid derivative", "MedlinePlus", MEDLINEPLUS, ["NAC", "acetylcysteine", "n acetylcysteine", "n-acetyl-cysteine", "cysteine precursor"]),
    ("L-Theanine", "amino acid", "MedlinePlus", MEDLINEPLUS, ["theanine", "L theanine", "green tea amino acid", "gamma-glutamylethylamide", "relaxation supplement"]),
    ("Elderberry", "botanical", "NCCIH", NCCIH, ["sambucus", "sambucus nigra", "elderberry syrup", "black elder", "elder flower"]),
    ("Vitamin A", "vitamin", "NIH ODS", NIH_ODS, ["retinol", "retinyl palmitate", "beta-carotene", "provitamin A", "vit A"]),
    ("Vitamin B1", "vitamin", "NIH ODS", NIH_ODS, ["thiamin", "thiamine", "thiamine HCL", "benfotiamine", "vit B1"]),
    ("Vitamin B2", "vitamin", "NIH ODS", NIH_ODS, ["riboflavin", "riboflavin-5-phosphate", "vit B2", "B2", "riboflavine"]),
    ("Vitamin B3", "vitamin", "NIH ODS", NIH_ODS, ["niacin", "nicotinic acid", "niacinamide", "nicotinamide", "vit B3"]),
    ("Vitamin B5", "vitamin", "NIH ODS", NIH_ODS, ["pantothenic acid", "calcium pantothenate", "panthenol", "vit B5", "B5"]),
    ("Vitamin B6", "vitamin", "NIH ODS", NIH_ODS, ["pyridoxine", "pyridoxal-5-phosphate", "P5P", "vit B6", "B6"]),
    ("Vitamin B7", "vitamin", "NIH ODS", NIH_ODS, ["biotin", "vitamin H", "B7", "hair skin nails vitamin", "D-biotin"]),
    ("Vitamin B9", "vitamin", "NIH ODS", NIH_ODS, ["folate", "folic acid", "methylfolate", "5-MTHF", "vit B9"]),
    ("Vitamin B12", "vitamin", "NIH ODS", NIH_ODS, ["cobalamin", "methylcobalamin", "cyanocobalamin", "hydroxocobalamin", "vit B12"]),
    ("Vitamin C", "vitamin", "NIH ODS", NIH_ODS, ["ascorbic acid", "sodium ascorbate", "calcium ascorbate", "vit C", "C vitamin"]),
    ("Vitamin D", "vitamin", "NIH ODS", NIH_ODS, ["D3", "D2", "cholecalciferol", "ergocalciferol", "vit D"]),
    ("Vitamin E", "vitamin", "NIH ODS", NIH_ODS, ["alpha-tocopherol", "tocopherols", "tocotrienols", "vit E", "mixed tocopherols"]),
    ("Vitamin K", "vitamin", "NIH ODS", NIH_ODS, ["K1", "K2", "phylloquinone", "menaquinone", "MK-7"]),
    ("Calcium", "mineral", "NIH ODS", NIH_ODS, ["Ca", "calcium citrate", "calcium carbonate", "calcium phosphate", "calcium supplement"]),
    ("Iron", "mineral", "NIH ODS", NIH_ODS, ["Fe", "ferrous sulfate", "ferrous gluconate", "ferrous fumarate", "iron bisglycinate"]),
    ("Selenium", "mineral", "NIH ODS", NIH_ODS, ["Se", "selenomethionine", "sodium selenite", "selenium yeast", "selenate"]),
    ("Iodine", "mineral", "NIH ODS", NIH_ODS, ["iodide", "potassium iodide", "kelp iodine", "iodine drops", "I"]),
    ("Copper", "mineral", "NIH ODS", NIH_ODS, ["Cu", "copper gluconate", "copper bisglycinate", "copper citrate", "cupric oxide"]),
    ("Manganese", "mineral", "NIH ODS", NIH_ODS, ["Mn", "manganese gluconate", "manganese citrate", "manganese sulfate", "manganese amino acid chelate"]),
    ("Chromium", "mineral", "NIH ODS", NIH_ODS, ["Cr", "chromium picolinate", "chromium chloride", "chromium polynicotinate", "chromium nicotinate"]),
    ("Molybdenum", "mineral", "NIH ODS", NIH_ODS, ["Mo", "sodium molybdate", "molybdenum glycinate", "molybdate", "molybdenum supplement"]),
    ("Potassium", "mineral", "NIH ODS", NIH_ODS, ["K", "potassium citrate", "potassium chloride", "potassium gluconate", "electrolyte potassium"]),
    ("Phosphorus", "mineral", "NIH ODS", NIH_ODS, ["phosphate", "phosphates", "P", "phosphorus supplement", "phosphate salts"]),
    ("Choline", "essential nutrient", "NIH ODS", NIH_ODS, ["choline bitartrate", "alpha GPC", "citicoline", "CDP choline", "phosphatidylcholine"]),
    ("Boron", "trace mineral", "MedlinePlus", MEDLINEPLUS, ["boron citrate", "boron glycinate", "boric mineral", "boron complex", "boron supplement"]),
    ("Silicon", "trace mineral", "MedlinePlus", MEDLINEPLUS, ["silica", "orthosilicic acid", "horsetail silica", "silicon dioxide", "silica supplement"]),
    ("Glucosamine", "joint support", "NCCIH", NCCIH, ["glucosamine sulfate", "glucosamine hydrochloride", "glucosamine HCL", "shellfish joint supplement", "2-amino-2-deoxyglucose"]),
    ("Chondroitin", "joint support", "NCCIH", NCCIH, ["chondroitin sulfate", "cartilage supplement", "joint chondroitin", "chondroitin sodium", "CS"]),
    ("MSM", "joint support", "MedlinePlus", MEDLINEPLUS, ["methylsulfonylmethane", "methyl sulfone", "dimethyl sulfone", "organic sulfur", "MSM powder"]),
    ("Hyaluronic Acid", "joint and skin support", "MedlinePlus", MEDLINEPLUS, ["sodium hyaluronate", "hyaluronan", "HA", "hyaluronic acid capsules", "skin hydration supplement"]),
    ("Glutamine", "amino acid", "MedlinePlus", MEDLINEPLUS, ["L-glutamine", "glutamine powder", "glutamine supplement", "Gln", "amino acid glutamine"]),
    ("Branched-Chain Amino Acids", "amino acid", "MedlinePlus", MEDLINEPLUS, ["BCAA", "leucine isoleucine valine", "branched chain amino acids", "BCAAs", "workout amino acids"]),
    ("Leucine", "amino acid", "MedlinePlus", MEDLINEPLUS, ["L-leucine", "leucine powder", "essential amino acid leucine", "BCAA leucine", "2-amino-4-methylpentanoic acid"]),
    ("Carnitine", "amino acid derivative", "NIH ODS", NIH_ODS, ["L-carnitine", "acetyl L-carnitine", "ALCAR", "carnitine tartrate", "levocarnitine"]),
    ("Taurine", "amino sulfonic acid", "MedlinePlus", MEDLINEPLUS, ["L-taurine", "taurine powder", "2-aminoethanesulfonic acid", "energy drink amino acid", "taurine supplement"]),
    ("Arginine", "amino acid", "MedlinePlus", MEDLINEPLUS, ["L-arginine", "arginine HCL", "nitric oxide support", "arginine powder", "Arg"]),
    ("Citrulline", "amino acid", "MedlinePlus", MEDLINEPLUS, ["L-citrulline", "citrulline malate", "watermelon amino acid", "nitric oxide citrulline", "citrulline powder"]),
    ("Beta-Alanine", "amino acid", "MedlinePlus", MEDLINEPLUS, ["beta alanine", "carnosine precursor", "beta-alanine powder", "BA", "sports beta alanine"]),
    ("Inositol", "vitamin-like compound", "MedlinePlus", MEDLINEPLUS, ["myo-inositol", "D-chiro-inositol", "inositol powder", "vitamin B8", "inositol supplement"]),
    ("Alpha-Lipoic Acid", "antioxidant", "MedlinePlus", MEDLINEPLUS, ["ALA", "thioctic acid", "lipoic acid", "alpha lipoic acid", "R-lipoic acid"]),
    ("Resveratrol", "polyphenol", "MedlinePlus", MEDLINEPLUS, ["trans-resveratrol", "grape skin extract", "polygonum cuspidatum", "red wine polyphenol", "resveratrol extract"]),
    ("Quercetin", "flavonoid", "MedlinePlus", MEDLINEPLUS, ["quercetin dihydrate", "quercetin phytosome", "flavonoid quercetin", "onion extract", "quercetin bromelain"]),
    ("Bromelain", "enzyme", "NCCIH", NCCIH, ["pineapple enzyme", "bromelain enzyme", "bromelain extract", "ananas comosus", "proteolytic enzyme"]),
    ("Papain", "enzyme", "MedlinePlus", MEDLINEPLUS, ["papaya enzyme", "carica papaya enzyme", "papain enzyme", "proteolytic papain", "papaya extract"]),
    ("Digestive Enzymes", "enzyme blend", "MedlinePlus", MEDLINEPLUS, ["amylase lipase protease", "enzyme blend", "digestive enzyme complex", "pancreatic enzymes", "food enzymes"]),
    ("Psyllium", "fiber", "MedlinePlus", MEDLINEPLUS, ["psyllium husk", "ispaghula", "plantago ovata", "soluble fiber", "psyllium fiber"]),
    ("Inulin", "fiber", "MedlinePlus", MEDLINEPLUS, ["chicory root fiber", "prebiotic fiber", "fructooligosaccharide", "FOS", "inulin fiber"]),
    ("Beta-Glucan", "fiber", "MedlinePlus", MEDLINEPLUS, ["oat beta glucan", "yeast beta glucan", "beta glucans", "soluble beta glucan", "immune beta glucan"]),
    ("Green Tea Extract", "botanical", "NCCIH", NCCIH, ["camellia sinensis", "EGCG", "green tea polyphenols", "green tea catechins", "tea extract"]),
    ("Ginseng", "botanical", "NCCIH", NCCIH, ["panax ginseng", "asian ginseng", "korean ginseng", "american ginseng", "ginsenosides"]),
    ("Ginkgo", "botanical", "NCCIH", NCCIH, ["ginkgo biloba", "ginkgo leaf", "maidenhair tree", "ginkgo extract", "EGb 761"]),
    ("Garlic", "botanical", "NCCIH", NCCIH, ["allium sativum", "garlic extract", "aged garlic extract", "allicin", "garlic supplement"]),
    ("Ginger", "botanical", "NCCIH", NCCIH, ["zingiber officinale", "ginger root", "ginger extract", "ginger capsules", "gingerol"]),
    ("Peppermint Oil", "botanical", "NCCIH", NCCIH, ["mentha piperita", "peppermint extract", "enteric coated peppermint", "peppermint capsules", "peppermint essential oil"]),
    ("Chamomile", "botanical", "NCCIH", NCCIH, ["matricaria chamomilla", "german chamomile", "roman chamomile", "chamomile flower", "chamomile extract"]),
    ("Valerian", "botanical", "NCCIH", NCCIH, ["valeriana officinalis", "valerian root", "valerian extract", "sleep root", "valerenic acid"]),
    ("Passionflower", "botanical", "NCCIH", NCCIH, ["passiflora", "passiflora incarnata", "passion flower", "maypop", "passionflower extract"]),
    ("Lavender", "botanical", "NCCIH", NCCIH, ["lavandula", "lavender oil", "lavender extract", "silexan", "lavandula angustifolia"]),
    ("Milk Thistle", "botanical", "NCCIH", NCCIH, ["silymarin", "silybum marianum", "milk thistle extract", "silybin", "liver support herb"]),
    ("Saw Palmetto", "botanical", "NCCIH", NCCIH, ["serenoa repens", "saw palmetto berry", "saw palmetto extract", "palmetto", "prostate herb"]),
    ("Cranberry", "botanical", "NCCIH", NCCIH, ["vaccinium macrocarpon", "cranberry extract", "cranberry capsules", "cranberry concentrate", "cranberry supplement"]),
    ("Echinacea", "botanical", "NCCIH", NCCIH, ["echinacea purpurea", "purple coneflower", "echinacea extract", "echinacea root", "echinacea herb"]),
    ("Goldenseal", "botanical", "NCCIH", NCCIH, ["hydrastis canadensis", "goldenseal root", "goldenseal extract", "hydrastine", "berberine herb"]),
    ("St. John's Wort", "botanical", "NCCIH", NCCIH, ["hypericum perforatum", "st johns wort", "saint john's wort", "hypericum", "SJW"]),
    ("Black Cohosh", "botanical", "NCCIH", NCCIH, ["actaea racemosa", "cimicifuga racemosa", "black cohosh root", "menopause herb", "black snakeroot"]),
    ("Red Clover", "botanical", "NCCIH", NCCIH, ["trifolium pratense", "red clover extract", "isoflavones", "clover blossom", "red clover herb"]),
    ("Evening Primrose Oil", "fatty acid", "NCCIH", NCCIH, ["EPO", "oenothera biennis", "gamma-linolenic acid", "GLA oil", "evening primrose"]),
    ("Flaxseed Oil", "fatty acid", "NCCIH", NCCIH, ["flax oil", "linseed oil", "ALA oil", "linum usitatissimum", "flaxseed supplement"]),
    ("Spirulina", "algae", "MedlinePlus", MEDLINEPLUS, ["blue green algae", "arthrospira", "spirulina powder", "spirulina tablets", "algae supplement"]),
    ("Chlorella", "algae", "MedlinePlus", MEDLINEPLUS, ["chlorella vulgaris", "chlorella pyrenoidosa", "green algae", "chlorella powder", "chlorella tablets"]),
    ("Kelp", "algae", "MedlinePlus", MEDLINEPLUS, ["sea kelp", "kelp iodine", "brown seaweed", "laminaria", "kelp supplement"]),
    ("Beetroot", "plant extract", "MedlinePlus", MEDLINEPLUS, ["beet root", "beetroot powder", "beet juice", "dietary nitrate", "beta vulgaris"]),
    ("Cinnamon", "botanical", "NCCIH", NCCIH, ["cinnamomum", "cassia cinnamon", "ceylon cinnamon", "cinnamon bark", "cinnamon extract"]),
    ("Fenugreek", "botanical", "NCCIH", NCCIH, ["trigonella foenum-graecum", "fenugreek seed", "methi", "fenugreek extract", "fenugreek capsules"]),
    ("Rhodiola", "botanical", "NCCIH", NCCIH, ["rhodiola rosea", "roseroot", "golden root", "rhodiola extract", "salidroside"]),
    ("Maca", "botanical", "MedlinePlus", MEDLINEPLUS, ["lepidium meyenii", "maca root", "peruvian ginseng", "maca powder", "maca extract"]),
    ("Moringa", "botanical", "MedlinePlus", MEDLINEPLUS, ["moringa oleifera", "moringa leaf", "drumstick tree", "moringa powder", "moringa capsules"]),
    ("Aloe Vera", "botanical", "NCCIH", NCCIH, ["aloe", "aloe gel", "aloe latex", "aloe barbadensis", "aloe extract"]),
    ("Dandelion", "botanical", "MedlinePlus", MEDLINEPLUS, ["taraxacum officinale", "dandelion root", "dandelion leaf", "dandelion extract", "dandelion tea"]),
    ("Nettle", "botanical", "MedlinePlus", MEDLINEPLUS, ["stinging nettle", "urtica dioica", "nettle leaf", "nettle root", "nettle extract"]),
    ("Licorice Root", "botanical", "NCCIH", NCCIH, ["glycyrrhiza glabra", "licorice", "DGL", "deglycyrrhizinated licorice", "licorice extract"]),
    ("Boswellia", "botanical", "MedlinePlus", MEDLINEPLUS, ["boswellia serrata", "frankincense extract", "AKBA", "indian frankincense", "boswellic acids"]),
    ("Devil's Claw", "botanical", "NCCIH", NCCIH, ["harpagophytum procumbens", "devils claw", "grapple plant", "devil claw root", "harpagoside"]),
    ("SAMe", "compound", "MedlinePlus", MEDLINEPLUS, ["S-adenosylmethionine", "ademetionine", "sam e", "SAM-e", "S adenosyl methionine"]),
    ("DHEA", "hormone precursor", "MedlinePlus", MEDLINEPLUS, ["dehydroepiandrosterone", "DHEA supplement", "prasterone", "androstenolone", "DHEA capsules"]),
    ("Pregnenolone", "hormone precursor", "MedlinePlus", MEDLINEPLUS, ["pregnenolone supplement", "P5", "steroid precursor", "pregnenolone capsules", "pregnenolone hormone"]),
    ("5-HTP", "amino acid derivative", "MedlinePlus", MEDLINEPLUS, ["5 hydroxytryptophan", "oxitriptan", "griffonia seed extract", "5HTP", "serotonin precursor"]),
    ("L-Tryptophan", "amino acid", "MedlinePlus", MEDLINEPLUS, ["tryptophan", "L tryptophan", "Trp", "serotonin amino acid", "tryptophan supplement"]),
    ("Electrolyte Blend", "mineral blend", "MedlinePlus", MEDLINEPLUS, ["electrolytes", "hydration salts", "sodium potassium magnesium", "ORS", "hydration supplement"]),
]


NUTRIENTS = [
    ("EPA", "mg", "Omega-3 fatty acid"),
    ("DHA", "mg", "Omega-3 fatty acid"),
    ("ALA", "mg", "Omega-3 fatty acid"),
    ("Selenium", "mcg", "Trace mineral"),
    ("Iodine", "mcg", "Trace mineral"),
    ("Copper", "mg", "Trace mineral"),
    ("Manganese", "mg", "Trace mineral"),
    ("Chromium", "mcg", "Trace mineral"),
    ("Molybdenum", "mcg", "Trace mineral"),
    ("Choline", "mg", "Essential nutrient"),
    ("Boron", "mg", "Trace mineral"),
    ("Silicon", "mg", "Trace mineral"),
    ("Lutein", "mg", "Carotenoid"),
    ("Zeaxanthin", "mg", "Carotenoid"),
    ("Lycopene", "mg", "Carotenoid"),
    ("Beta-Carotene", "mcg", "Provitamin A carotenoid"),
    ("Curcumin", "mg", "Polyphenol"),
    ("Quercetin", "mg", "Flavonoid"),
    ("Resveratrol", "mg", "Polyphenol"),
    ("EGCG", "mg", "Green tea catechin"),
    ("Caffeine", "mg", "Bioactive compound"),
    ("Creatine", "g", "Nitrogenous organic acid"),
    ("L-Theanine", "mg", "Amino acid"),
    ("N-Acetyl Cysteine", "mg", "Amino acid derivative"),
    ("Glutamine", "g", "Amino acid"),
    ("Leucine", "g", "Essential amino acid"),
    ("Isoleucine", "g", "Essential amino acid"),
    ("Valine", "g", "Essential amino acid"),
    ("Carnitine", "mg", "Amino acid derivative"),
    ("Taurine", "mg", "Amino sulfonic acid"),
    ("Arginine", "g", "Amino acid"),
    ("Citrulline", "g", "Amino acid"),
    ("Beta-Alanine", "g", "Amino acid"),
    ("Inositol", "mg", "Vitamin-like compound"),
    ("Alpha-Lipoic Acid", "mg", "Antioxidant compound"),
    ("Psyllium Fiber", "g", "Soluble fiber"),
    ("Inulin Fiber", "g", "Prebiotic fiber"),
    ("Beta-Glucan", "g", "Soluble fiber"),
    ("Glucosamine", "mg", "Amino sugar"),
    ("Chondroitin", "mg", "Glycosaminoglycan"),
    ("MSM", "mg", "Organosulfur compound"),
    ("Coenzyme Q10", "mg", "Coenzyme"),
    ("Berberine", "mg", "Plant alkaloid"),
    ("Silymarin", "mg", "Milk thistle flavonolignan complex"),
    ("Allicin", "mg", "Garlic sulfur compound"),
    ("Gingerols", "mg", "Ginger phenolic compounds"),
    ("Isoflavones", "mg", "Plant phytoestrogens"),
    ("Probiotic CFU", "CFU", "Viable probiotic count"),
    ("Collagen Peptides", "g", "Protein peptides"),
    ("Electrolytes", "mg", "Mineral electrolyte blend"),
]


INTAKE_REFERENCES = [
    ("Vitamin A", "rda", "Adults", "male", "900", "mcg RAE"),
    ("Vitamin A", "rda", "Adults", "female", "700", "mcg RAE"),
    ("Vitamin A", "ul", "Adults", "", "3000", "mcg RAE"),
    ("Vitamin C", "rda", "Adults", "male", "90", "mg"),
    ("Vitamin C", "rda", "Adults", "female", "75", "mg"),
    ("Vitamin C", "ul", "Adults", "", "2000", "mg"),
    ("Vitamin D", "rda", "Adults 19-70", "", "15", "mcg"),
    ("Vitamin D", "rda", "Adults 71+", "", "20", "mcg"),
    ("Vitamin D", "ul", "Adults", "", "100", "mcg"),
    ("Vitamin E", "rda", "Adults", "", "15", "mg"),
    ("Vitamin E", "ul", "Adults", "", "1000", "mg"),
    ("Vitamin K", "ai", "Adults", "male", "120", "mcg"),
    ("Vitamin K", "ai", "Adults", "female", "90", "mcg"),
    ("Vitamin B1", "rda", "Adults", "male", "1.2", "mg"),
    ("Vitamin B1", "rda", "Adults", "female", "1.1", "mg"),
    ("Vitamin B2", "rda", "Adults", "male", "1.3", "mg"),
    ("Vitamin B2", "rda", "Adults", "female", "1.1", "mg"),
    ("Vitamin B3", "rda", "Adults", "male", "16", "mg NE"),
    ("Vitamin B3", "rda", "Adults", "female", "14", "mg NE"),
    ("Vitamin B3", "ul", "Adults", "", "35", "mg"),
    ("Vitamin B5", "ai", "Adults", "", "5", "mg"),
    ("Vitamin B6", "rda", "Adults 19-50", "", "1.3", "mg"),
    ("Vitamin B6", "ul", "Adults", "", "100", "mg"),
    ("Vitamin B7", "ai", "Adults", "", "30", "mcg"),
    ("Vitamin B9", "rda", "Adults", "", "400", "mcg DFE"),
    ("Vitamin B9", "ul", "Adults", "", "1000", "mcg"),
    ("Vitamin B12", "rda", "Adults", "", "2.4", "mcg"),
    ("Calcium", "rda", "Adults 19-50", "", "1000", "mg"),
    ("Calcium", "rda", "Women 51+", "", "1200", "mg"),
    ("Calcium", "ul", "Adults 19-50", "", "2500", "mg"),
    ("Iron", "rda", "Adults", "male", "8", "mg"),
    ("Iron", "rda", "Adults 19-50", "female", "18", "mg"),
    ("Iron", "ul", "Adults", "", "45", "mg"),
    ("Magnesium", "rda", "Adults", "male", "420", "mg"),
    ("Magnesium", "rda", "Adults", "female", "320", "mg"),
    ("Magnesium", "ul", "Adults supplemental", "", "350", "mg"),
    ("Zinc", "rda", "Adults", "male", "11", "mg"),
    ("Zinc", "rda", "Adults", "female", "8", "mg"),
    ("Zinc", "ul", "Adults", "", "40", "mg"),
    ("Selenium", "rda", "Adults", "", "55", "mcg"),
    ("Selenium", "ul", "Adults", "", "400", "mcg"),
    ("Iodine", "rda", "Adults", "", "150", "mcg"),
    ("Iodine", "ul", "Adults", "", "1100", "mcg"),
    ("Copper", "rda", "Adults", "", "0.9", "mg"),
    ("Copper", "ul", "Adults", "", "10", "mg"),
    ("Manganese", "ai", "Adults", "male", "2.3", "mg"),
    ("Manganese", "ai", "Adults", "female", "1.8", "mg"),
    ("Manganese", "ul", "Adults", "", "11", "mg"),
    ("Chromium", "ai", "Adults", "male", "35", "mcg"),
    ("Chromium", "ai", "Adults", "female", "25", "mcg"),
    ("Molybdenum", "rda", "Adults", "", "45", "mcg"),
    ("Molybdenum", "ul", "Adults", "", "2000", "mcg"),
    ("Potassium", "ai", "Adults", "male", "3400", "mg"),
    ("Potassium", "ai", "Adults", "female", "2600", "mg"),
    ("Phosphorus", "rda", "Adults", "", "700", "mg"),
    ("Phosphorus", "ul", "Adults", "", "4000", "mg"),
    ("Choline", "ai", "Adults", "male", "550", "mg"),
    ("Choline", "ai", "Adults", "female", "425", "mg"),
    ("Choline", "ul", "Adults", "", "3500", "mg"),
    ("Omega-3 Fatty Acids", "ai", "Adults", "male", "1.6", "g ALA"),
    ("Omega-3 Fatty Acids", "ai", "Adults", "female", "1.1", "g ALA"),
    ("Boron", "ul", "Adults", "", "20", "mg"),
    ("Fluoride", "ai", "Adults", "male", "4", "mg"),
    ("Fluoride", "ai", "Adults", "female", "3", "mg"),
    ("Fluoride", "ul", "Adults", "", "10", "mg"),
    ("Sodium", "ai", "Adults", "", "1500", "mg"),
    ("Sodium", "ul", "Adults", "", "2300", "mg"),
    ("Chloride", "ai", "Adults", "", "2300", "mg"),
    ("Chloride", "ul", "Adults", "", "3600", "mg"),
]


SAFETY_TARGETS = {
    "Iron": [
        ("absorption", "Calcium", "caution", "Calcium may reduce iron absorption", "Separate high-dose calcium and iron unless a clinician advised otherwise."),
        ("absorption", "Coffee or tea", "caution", "Coffee and tea can reduce non-heme iron absorption", "Avoid taking iron with coffee or tea when possible."),
        ("upper_limit", "Iron intake", "warning", "Excess iron can be harmful", "Do not exceed the adult upper limit unless prescribed."),
    ],
    "Vitamin K": [
        ("drug_interaction", "Warfarin", "warning", "Vitamin K can affect anticoagulant therapy", "Keep intake consistent and involve a clinician if using anticoagulants."),
        ("condition_caution", "Clotting disorders", "caution", "Use caution with clotting-related conditions", "Use clinician guidance for clotting disorders or anticoagulant care."),
    ],
    "St. John's Wort": [
        ("drug_interaction", "SSRIs and serotonergic drugs", "warning", "May interact with antidepressants", "Avoid combining without medical supervision."),
        ("drug_interaction", "Oral contraceptives", "warning", "May reduce effectiveness of some medications", "Check with a clinician or pharmacist before use."),
        ("drug_interaction", "Immunosuppressants", "warning", "Can interact with important prescription medicines", "Avoid unsupervised use with prescription medicines."),
        ("side_effect", "Photosensitivity", "caution", "May increase sensitivity to sunlight", "Monitor for skin sensitivity and discontinue if adverse effects occur."),
    ],
    "Magnesium": [
        ("drug_interaction", "Certain antibiotics", "caution", "Magnesium can reduce absorption of some antibiotics", "Separate dosing from tetracycline or quinolone antibiotics."),
        ("drug_interaction", "Bisphosphonates", "caution", "Magnesium can reduce bisphosphonate absorption", "Separate dosing as directed by the medication label."),
        ("upper_limit", "Supplemental magnesium", "caution", "High supplemental magnesium can cause gastrointestinal effects", "Stay within supplemental upper limits unless advised."),
    ],
    "Zinc": [
        ("absorption", "Copper", "caution", "High zinc intake can reduce copper status", "Avoid chronic high-dose zinc without monitoring copper status."),
        ("drug_interaction", "Certain antibiotics", "caution", "Zinc can reduce absorption of some antibiotics", "Separate dosing from tetracycline or quinolone antibiotics."),
        ("upper_limit", "Zinc intake", "caution", "Excess zinc can cause adverse effects", "Avoid exceeding the adult upper limit chronically."),
    ],
    "Calcium": [
        ("drug_interaction", "Levothyroxine", "caution", "Calcium can reduce levothyroxine absorption", "Separate calcium and thyroid medication as directed."),
        ("drug_interaction", "Certain antibiotics", "caution", "Calcium can bind some antibiotics", "Separate dosing from tetracycline or quinolone antibiotics."),
        ("upper_limit", "Calcium intake", "caution", "Excess calcium can increase adverse-effect risk", "Avoid exceeding upper limits unless medically indicated."),
    ],
    "Vitamin D": [
        ("upper_limit", "Vitamin D intake", "caution", "Excess vitamin D can cause toxicity", "Avoid chronic high-dose vitamin D without lab monitoring."),
        ("condition_caution", "Hypercalcemia", "warning", "Vitamin D may worsen high calcium levels", "Use clinician guidance with hypercalcemia or sarcoidosis."),
    ],
    "Vitamin A": [
        ("pregnancy_caution", "Pregnancy", "warning", "Preformed vitamin A excess is unsafe in pregnancy", "Avoid high-dose retinol unless prescribed."),
        ("upper_limit", "Preformed vitamin A", "warning", "High retinol intake can be toxic", "Do not exceed upper limits from supplements."),
    ],
    "Vitamin B3": [
        ("upper_limit", "Niacin", "caution", "High-dose niacin can cause flushing and liver concerns", "Use high-dose niacin only with clinician supervision."),
        ("condition_caution", "Liver disease", "warning", "Niacin requires caution with liver disease", "Avoid high-dose use without medical guidance."),
    ],
    "Vitamin B6": [
        ("upper_limit", "Vitamin B6 intake", "caution", "Long-term high-dose B6 can cause nerve symptoms", "Avoid chronic high-dose use without monitoring."),
    ],
    "Selenium": [
        ("upper_limit", "Selenium intake", "warning", "Excess selenium can be toxic", "Avoid exceeding the adult upper limit."),
    ],
    "Iodine": [
        ("condition_caution", "Thyroid disease", "warning", "Iodine can affect thyroid function", "Use clinician guidance with thyroid disease or thyroid medication."),
        ("upper_limit", "Iodine intake", "caution", "Excess iodine can cause thyroid problems", "Avoid high-dose iodine unless medically directed."),
    ],
    "Potassium": [
        ("condition_caution", "Kidney disease", "warning", "Potassium supplements can be risky with kidney disease", "Use clinician guidance with kidney disease or potassium-sparing medications."),
        ("drug_interaction", "ACE inhibitors or potassium-sparing diuretics", "warning", "Potassium can interact with medicines that raise potassium", "Avoid unsupervised potassium supplementation."),
    ],
    "Coenzyme Q10": [
        ("drug_interaction", "Warfarin", "caution", "CoQ10 may affect anticoagulant management", "Discuss with a clinician if using anticoagulants."),
    ],
    "Melatonin": [
        ("side_effect", "Sedation", "caution", "Melatonin can cause drowsiness", "Avoid driving or alcohol when sedation occurs."),
        ("drug_interaction", "Sedatives", "caution", "May add to sedative effects", "Use caution with sedating medicines."),
    ],
    "Ashwagandha": [
        ("pregnancy_caution", "Pregnancy", "warning", "Avoid during pregnancy unless advised", "Use clinician guidance during pregnancy or trying to conceive."),
        ("condition_caution", "Thyroid conditions", "caution", "May affect thyroid-related management", "Use caution with thyroid disorders or medications."),
        ("side_effect", "Liver symptoms", "warning", "Rare liver injury has been reported", "Stop use and seek care for jaundice, dark urine, or severe fatigue."),
    ],
    "Turmeric": [
        ("drug_interaction", "Anticoagulants or antiplatelets", "caution", "High-dose turmeric may increase bleeding concern", "Use clinician guidance with blood thinners."),
        ("condition_caution", "Gallbladder disease", "caution", "May worsen gallbladder symptoms", "Use caution with gallstones or bile duct obstruction."),
    ],
    "Ginkgo": [
        ("drug_interaction", "Anticoagulants or antiplatelets", "warning", "May increase bleeding concern", "Avoid unsupervised use with blood thinners."),
        ("pregnancy_caution", "Pregnancy", "caution", "Use caution during pregnancy", "Use only with clinician guidance."),
    ],
    "Ginseng": [
        ("drug_interaction", "Warfarin", "caution", "May affect anticoagulant management", "Discuss with a clinician if using anticoagulants."),
        ("condition_caution", "Diabetes medications", "caution", "May affect blood glucose", "Monitor closely if using diabetes medications."),
    ],
    "Garlic": [
        ("drug_interaction", "Anticoagulants or antiplatelets", "caution", "Garlic supplements may increase bleeding concern", "Use clinician guidance with blood thinners or before surgery."),
    ],
    "Ginger": [
        ("drug_interaction", "Anticoagulants or antiplatelets", "caution", "High supplemental ginger may increase bleeding concern", "Use caution with blood thinners."),
    ],
    "Green Tea Extract": [
        ("side_effect", "Liver symptoms", "warning", "Concentrated extracts have been associated with liver injury", "Stop use and seek care for liver-related symptoms."),
        ("drug_interaction", "Stimulants", "caution", "Caffeine-containing extracts can add stimulant effects", "Check caffeine load and stimulant medicines."),
    ],
    "Goldenseal": [
        ("drug_interaction", "Prescription medications", "warning", "Can interact with drug-metabolizing enzymes", "Avoid unsupervised use with prescription medicines."),
        ("pregnancy_caution", "Pregnancy", "warning", "Avoid during pregnancy", "Do not use during pregnancy unless specifically directed."),
    ],
    "Black Cohosh": [
        ("side_effect", "Liver symptoms", "warning", "Liver injury has been reported", "Stop use and seek care for liver-related symptoms."),
        ("condition_caution", "Hormone-sensitive conditions", "caution", "Use caution with hormone-sensitive conditions", "Discuss use with a clinician."),
    ],
    "Licorice Root": [
        ("condition_caution", "High blood pressure", "warning", "Licorice can raise blood pressure and lower potassium", "Avoid glycyrrhizin-containing licorice with hypertension unless supervised."),
        ("drug_interaction", "Diuretics or heart medicines", "warning", "Can affect potassium and heart medication safety", "Use clinician guidance with heart, kidney, or blood pressure medicines."),
    ],
    "Berberine": [
        ("condition_caution", "Diabetes medications", "caution", "May affect blood glucose", "Monitor closely with diabetes medicines."),
        ("pregnancy_caution", "Pregnancy or breastfeeding", "warning", "Avoid unless directed by a clinician", "Do not use during pregnancy or breastfeeding without medical guidance."),
    ],
    "5-HTP": [
        ("drug_interaction", "SSRIs and serotonergic drugs", "warning", "May increase serotonin-related risks", "Avoid combining without medical supervision."),
    ],
    "SAMe": [
        ("drug_interaction", "Antidepressants", "warning", "May interact with antidepressant therapy", "Use only with clinician guidance."),
        ("condition_caution", "Bipolar disorder", "warning", "May worsen mood instability", "Avoid unsupervised use with bipolar disorder."),
    ],
    "DHEA": [
        ("condition_caution", "Hormone-sensitive conditions", "warning", "Hormone precursor requires caution", "Use clinician guidance before using hormone-active supplements."),
    ],
    "Aloe Vera": [
        ("side_effect", "Aloe latex", "warning", "Oral aloe latex can cause serious adverse effects", "Avoid oral aloe latex products."),
    ],
}


GENERIC_RULES = [
    ("condition_caution", "Prescription medications", "caution", "Review with medications", "Check with a clinician or pharmacist if using prescription medicines."),
    ("pregnancy_caution", "Pregnancy or breastfeeding", "caution", "Use caution during pregnancy or breastfeeding", "Use only with clinician guidance during pregnancy or breastfeeding."),
]


class Command(BaseCommand):
    help = "Seed a controlled supplement knowledge batch: supplements, aliases, safety rules, nutrients, and intake references."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show intended counts without writing data.")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run: no records will be written."))

        counters = {
            "supplements": 0,
            "aliases": 0,
            "nutrients": 0,
            "intake_references": 0,
            "safety_rules": 0,
        }

        supplement_map = {}
        selected_supplements = SUPPLEMENTS[:100]
        selected_names = {name for name, *_rest in selected_supplements}

        for name, category, source, source_url, aliases in selected_supplements:
            slug = slugify(name)
            defaults = {
                "description": f"{category.title()} supplement. Seeded for search, safety, and recommendation coverage.",
                "source": source,
                "source_id": slug,
                "is_active": True,
            }
            if dry_run:
                counters["supplements"] += 1
                supplement_map[name] = None
            else:
                supplement, _created = Supplement.objects.update_or_create(
                    slug=slug, defaults={"name": name, **defaults}
                )
                supplement_map[name] = supplement
                counters["supplements"] += 1

            alias_set = {name, name.lower(), slug.replace("-", " "), *aliases[:4]}
            for alias in sorted(alias_set):
                alias_slug = slugify(alias)
                if not alias_slug:
                    continue
                if not dry_run:
                    SupplementAlias.objects.update_or_create(
                        supplement=supplement_map[name],
                        slug=alias_slug,
                        defaults={
                            "alias": alias,
                            "source": source,
                            "source_url": source_url,
                            "active": True,
                        },
                    )
                counters["aliases"] += 1

        for name, unit, description in NUTRIENTS:
            slug = slugify(name)
            if not dry_run:
                Nutrient.objects.update_or_create(
                    slug=slug,
                    defaults={
                        "name": name,
                        "unit": unit,
                        "description": description,
                        "is_active": True,
                    },
                )
            counters["nutrients"] += 1

        for name, reference_type, life_stage, sex, amount, unit in INTAKE_REFERENCES:
            nutrient = None
            if not dry_run:
                nutrient, _ = Nutrient.objects.get_or_create(
                    slug=slugify(name),
                    defaults={"name": name, "unit": unit.split(" ")[0], "is_active": True},
                )
            if not dry_run:
                NutrientIntakeReference.objects.update_or_create(
                    nutrient=nutrient,
                    reference_type=reference_type,
                    life_stage=life_stage,
                    sex=sex,
                    defaults={
                        "amount": Decimal(amount),
                        "unit": unit,
                        "source": "NIH ODS",
                        "source_url": NIH_ODS,
                        "active": True,
                    },
                )
            counters["intake_references"] += 1

        safety_rows = []
        for supplement_name, rules in SAFETY_TARGETS.items():
            if supplement_name in selected_names:
                safety_rows.extend((supplement_name, *rule) for rule in rules)

        remaining_slots = 150 - len(safety_rows)
        botanical_names = [
            name for name, category, *_rest in selected_supplements if category in {"botanical", "algae", "plant extract"}
        ]
        for index, supplement_name in enumerate(botanical_names):
            if remaining_slots <= 0:
                break
            for rule in GENERIC_RULES:
                if remaining_slots <= 0:
                    break
                safety_rows.append((supplement_name, *rule))
                remaining_slots -= 1

        broad_caution_names = [
            name
            for name, category, *_rest in selected_supplements
            if category
            in {
                "botanical compound",
                "hormone precursor",
                "amino acid derivative",
                "sleep support",
                "compound",
                "fatty acid",
            }
        ]
        for supplement_name in broad_caution_names:
            if remaining_slots <= 0:
                break
            safety_rows.append(
                (
                    supplement_name,
                    "condition_caution",
                    "Existing medical conditions",
                    "caution",
                    "Review with existing medical conditions",
                    "Use clinician guidance when a supplement may affect an existing condition or treatment plan.",
                )
            )
            remaining_slots -= 1

        for supplement_name, _category, *_rest in selected_supplements:
            if remaining_slots <= 0:
                break
            safety_rows.append(
                (
                    supplement_name,
                    "side_effect",
                    "Adverse effects",
                    "info",
                    "Monitor for adverse effects",
                    "Stop use and seek qualified guidance if new or severe symptoms appear after starting the supplement.",
                )
            )
            remaining_slots -= 1

        for supplement_name, rule_type, interacting_entity, severity, title, recommendation in safety_rows[:150]:
            supplement = supplement_map.get(supplement_name)
            if supplement is None and not dry_run:
                supplement = Supplement.objects.filter(slug=slugify(supplement_name)).first()
            if not supplement and not dry_run:
                continue
            if not dry_run:
                SupplementSafetyRule.objects.update_or_create(
                    supplement=supplement,
                    rule_type=rule_type,
                    interacting_entity=interacting_entity,
                    title=title,
                    defaults={
                        "severity": severity,
                        "description": recommendation,
                        "recommendation": recommendation,
                        "source": "NIH ODS / NCCIH / MedlinePlus",
                        "source_url": NIH_ODS,
                        "active": True,
                    },
                )
            counters["safety_rules"] += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seeded supplement knowledge batch: "
                + ", ".join(f"{key}={value}" for key, value in counters.items())
            )
        )
