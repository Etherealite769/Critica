# backend/api/ai/fallback_pool.py
"""
High-quality, pre-verified fallback exercise bank for each module and difficulty tier.
Used when the Gemini API is temporarily unavailable, rate-limited, or fails validation.
"""
from typing import Dict, List, Any

FALLBACK_EXERCISES: Dict[str, Dict[int, List[Dict[str, Any]]]] = {
    'logic_thread': {
        1: [
            {
                "exercise_id": "fb_log_t1_01",
                "topic_title": "Solar Energy Absorption in Plant Chloroplasts",
                "reading_passage": "Sunlight penetrates the upper layer of a plant's green leaves. Specialized chlorophyll molecules absorb light photons within the chloroplasts. This absorbed light energy is subsequently converted into chemical energy during photosynthesis.",
                "paragraph_blocks": [
                    {"block_id": "p1", "text": "Sunlight penetrates the upper layer of a plant's green leaves.", "order": 1},
                    {"block_id": "p2", "text": "Specialized chlorophyll molecules absorb light photons within the chloroplasts.", "order": 2},
                    {"block_id": "p3", "text": "This absorbed light energy is subsequently converted into chemical energy during photosynthesis.", "order": 3}
                ],
                "correct_sequence": ["p1", "p2", "p3"],
                "structural_explanations": {
                    "p2__p1": "The light must penetrate the leaf before chlorophyll molecules can absorb it.",
                    "p3__p2": "Energy conversion relies on the previously absorbed photons described in p2."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Look for the initial action where sunlight reaches the leaf surface."},
                    {"tier": 2, "hint_text": "Chlorophyll absorption happens before the energy is converted."},
                    {"tier": 3, "hint_text": "The correct order is p1, then p2, and finally p3."}
                ]
            },
            {
                "exercise_id": "fb_log_t1_02",
                "topic_title": "Volcanic Ash Cloud Formation",
                "reading_passage": "Pressure accumulates deep inside magma chambers beneath the crust. A sudden rupture forces pulverized rock and superheated gases upward. A towering ash column billows into the upper atmosphere.",
                "paragraph_blocks": [
                    {"block_id": "p1", "text": "Pressure accumulates deep inside magma chambers beneath the crust.", "order": 1},
                    {"block_id": "p2", "text": "A sudden rupture forces pulverized rock and superheated gases upward.", "order": 2},
                    {"block_id": "p3", "text": "A towering ash column billows into the upper atmosphere.", "order": 3}
                ],
                "correct_sequence": ["p1", "p2", "p3"],
                "structural_explanations": {
                    "p2__p1": "Pressure buildup occurs prior to the explosive eruption rupture.",
                    "p3__p2": "The ash column forms as a direct consequence of the upward explosion."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Identify the cause of the eruption happening underground first."},
                    {"tier": 2, "hint_text": "The rupture releases material before the cloud expands in the sky."},
                    {"tier": 3, "hint_text": "Connect p1 to p2 to p3."}
                ]
            },
            {
                "exercise_id": "fb_log_t1_03",
                "topic_title": "Ancient Papyrus Paper Making",
                "reading_passage": "Harvested papyrus reeds are stripped of their outer green bark. The inner pith is sliced into thin vertical ribbons and pressed together. Once dried under heavy stones, smooth writing sheets are formed.",
                "paragraph_blocks": [
                    {"block_id": "p1", "text": "Harvested papyrus reeds are stripped of their outer green bark.", "order": 1},
                    {"block_id": "p2", "text": "The inner pith is sliced into thin vertical ribbons and pressed together.", "order": 2},
                    {"block_id": "p3", "text": "Once dried under heavy stones, smooth writing sheets are formed.", "order": 3}
                ],
                "correct_sequence": ["p1", "p2", "p3"],
                "structural_explanations": {
                    "p2__p1": "The outer bark must be stripped before slicing the inner pith.",
                    "p3__p2": "Drying and pressing the strips creates the final writing sheets."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Start with raw harvesting and preparing the reeds."},
                    {"tier": 2, "hint_text": "Slicing happens before the sheets are dried and completed."},
                    {"tier": 3, "hint_text": "Sequence is p1 -> p2 -> p3."}
                ]
            }
        ],
        2: [
            {
                "exercise_id": "fb_log_t2_01",
                "topic_title": "Bioluminescence in Deep-Sea Anglerfish",
                "reading_passage": "Sunlight cannot penetrate oceanic depths exceeding one thousand meters. Consequently, predatory species have evolved physiological adaptations to navigate pitch-black waters. The anglerfish utilizes a symbiotic bacterial lure suspended from its dorsal spine. This glowing beacon attracts unwary prey directly toward its formidable jaws.",
                "paragraph_blocks": [
                    {"block_id": "p1", "text": "Sunlight cannot penetrate oceanic depths exceeding one thousand meters.", "order": 1},
                    {"block_id": "p2", "text": "Consequently, predatory species have evolved physiological adaptations to navigate pitch-black waters.", "order": 2},
                    {"block_id": "p3", "text": "The anglerfish utilizes a symbiotic bacterial lure suspended from its dorsal spine.", "order": 3},
                    {"block_id": "p4", "text": "This glowing beacon attracts unwary prey directly toward its formidable jaws.", "order": 4}
                ],
                "correct_sequence": ["p1", "p2", "p3", "p4"],
                "structural_explanations": {
                    "p2__p1": "'Consequently' links the darkness in p1 to the evolutionary adaptation in p2.",
                    "p3__p2": "The anglerfish is introduced as a specific example of the predatory adaptation.",
                    "p4__p3": "'This glowing beacon' directly refers to the bacterial lure introduced in p3."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Begin with the environmental context of darkness at ocean depths."},
                    {"tier": 2, "hint_text": "Move from general adaptation to the specific example of the anglerfish."},
                    {"tier": 3, "hint_text": "Order: p1 (depths), p2 (adaptation), p3 (lure), p4 (hunting outcome)."}
                ]
            }
        ],
        3: [
            {
                "exercise_id": "fb_log_t3_01",
                "topic_title": "Archimedean Buoyancy and Hydrostatic Equilibrium",
                "reading_passage": "When an object is immersed in fluid, it experiences opposing hydrostatic forces along its surface. Pressure increases with depth, causing the fluid pressure on the bottom of the object to exceed that on the top. This differential creates an upward resultant force known as buoyant force. If the buoyant force equals the gravitational weight of the object, hydrostatic equilibrium is achieved.",
                "paragraph_blocks": [
                    {"block_id": "p1", "text": "When an object is immersed in fluid, it experiences opposing hydrostatic forces along its surface.", "order": 1},
                    {"block_id": "p2", "text": "Pressure increases with depth, causing the fluid pressure on the bottom of the object to exceed that on the top.", "order": 2},
                    {"block_id": "p3", "text": "This differential creates an upward resultant force known as buoyant force.", "order": 3},
                    {"block_id": "p4", "text": "If the buoyant force equals the gravitational weight of the object, hydrostatic equilibrium is achieved.", "order": 4}
                ],
                "correct_sequence": ["p1", "p2", "p3", "p4"],
                "structural_explanations": {
                    "p2__p1": "p2 explains the physical mechanism of the opposing forces introduced in p1.",
                    "p3__p2": "'This differential' refers directly to bottom vs top pressure described in p2.",
                    "p4__p3": "p4 defines equilibrium as the condition where buoyant force balances gravity."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Identify the foundational premise of immersion forces."},
                    {"tier": 2, "hint_text": "Trace how pressure differences create buoyant force."},
                    {"tier": 3, "hint_text": "The sequence is p1 -> p2 -> p3 -> p4."}
                ]
            }
        ]
    },
    'snap_gap': {
        1: [
            {
                "exercise_id": "fb_snp_t1_01",
                "topic_title": "Wind Turbine Power Generation",
                "reading_passage": "Modern wind turbines harness kinetic airflow to rotate massive composite blades. Furthermore, advanced gearboxes convert this rotational energy into electricity for the grid.",
                "sentence_pairs": [
                    {
                        "pair_id": "pair_1",
                        "sentence_a": "Modern wind turbines harness kinetic airflow to rotate massive composite blades.",
                        "sentence_b": "advanced gearboxes convert this rotational energy into electricity for the grid."
                    }
                ],
                "transition_tile_dock": ["Furthermore", "However", "In contrast", "Conversely"],
                "correct_tile_map": {"pair_1": "Furthermore"},
                "tile_error_explanations": {
                    "pair_1__However": "'However' indicates conflict, but sentence B adds another step in the generation process."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Determine if sentence B adds supporting information or introduces an obstacle."},
                    {"tier": 2, "hint_text": "Sentence B elaborates on the system, which requires an addition transition."},
                    {"tier": 3, "hint_text": "Use the addition tile 'Furthermore'."}
                ]
            }
        ],
        2: [
            {
                "exercise_id": "fb_snp_t2_01",
                "topic_title": "Renewable Microgrids in Island Communities",
                "reading_passage": "Island communities frequently experience high fuel import costs for diesel generators. Therefore, local governments are investing heavily in localized solar microgrids. However, energy storage battery systems require significant capital investment.",
                "sentence_pairs": [
                    {
                        "pair_id": "pair_1",
                        "sentence_a": "Island communities frequently experience high fuel import costs for diesel generators.",
                        "sentence_b": "local governments are investing heavily in localized solar microgrids."
                    },
                    {
                        "pair_id": "pair_2",
                        "sentence_a": "Local governments are investing heavily in localized solar microgrids.",
                        "sentence_b": "energy storage battery systems require significant capital investment."
                    }
                ],
                "transition_tile_dock": ["Therefore", "However", "Similarly", "For instance"],
                "correct_tile_map": {
                    "pair_1": "Therefore",
                    "pair_2": "However"
                },
                "tile_error_explanations": {
                    "pair_1__However": "Sentence B is a direct consequence/solution of high costs in sentence A, requiring 'Therefore'.",
                    "pair_2__Therefore": "Sentence B introduces a cost drawback/limitation, requiring a contrast tile like 'However'."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Pair 1 shows cause and effect, while Pair 2 presents a financial obstacle."},
                    {"tier": 2, "hint_text": "Pair 1 needs a result word, Pair 2 needs a contrast word."},
                    {"tier": 3, "hint_text": "Slot 'Therefore' for Pair 1 and 'However' for Pair 2."}
                ]
            }
        ],
        3: [
            {
                "exercise_id": "fb_snp_t3_01",
                "topic_title": "Quantum Computing Superposition and Thermal Decoherence",
                "reading_passage": "Quantum qubits leverage quantum superposition to process exponential computational states simultaneously. In contrast, classical silicon bits remain strictly binary. Nonetheless, ambient thermal vibrations can induce rapid quantum decoherence.",
                "sentence_pairs": [
                    {
                        "pair_id": "pair_1",
                        "sentence_a": "Quantum qubits leverage quantum superposition to process exponential computational states simultaneously.",
                        "sentence_b": "classical silicon bits remain strictly binary."
                    },
                    {
                        "pair_id": "pair_2",
                        "sentence_a": "Classical silicon bits remain strictly binary.",
                        "sentence_b": "ambient thermal vibrations can induce rapid quantum decoherence in qubits."
                    }
                ],
                "transition_tile_dock": ["In contrast", "Nonetheless", "As a result", "Consequently"],
                "correct_tile_map": {
                    "pair_1": "In contrast",
                    "pair_2": "Nonetheless"
                },
                "tile_error_explanations": {
                    "pair_1__As a result": "Sentence B highlights a difference between quantum and classical architecture, not a consequence."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Look for comparison between two computing paradigms in pair 1."},
                    {"tier": 2, "hint_text": "Pair 2 introduces an engineering vulnerability despite computational power."},
                    {"tier": 3, "hint_text": "Use 'In contrast' for pair 1 and 'Nonetheless' for pair 2."}
                ]
            }
        ]
    },
    'tap_clues': {
        1: [
            {
                "exercise_id": "fb_tap_t1_01",
                "topic_title": "Arctic Adaptation of the Snowy Owl",
                "reading_passage": "The snowy owl possesses dense plumage that shields it from freezing blizzard winds. This thick covering of feathers keeps the predator warm across the tundra.",
                "locked_words": [
                    {
                        "word_id": "w1",
                        "word": "plumage",
                        "position_index": 5,
                        "correct_clue_ids": ["feathers", "covering"],
                        "definition": "The layer or collection of feathers covering a bird's body.",
                        "contextual_usage": "Refers to the dense feather insulation of Arctic owls.",
                        "translation": "bird feathers / coat"
                    }
                ],
                "clue_error_explanations": {
                    "w1__blizzard": "'blizzard' describes cold weather conditions, not the owl's physical feather layer."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Look in the second sentence for a word that explains what covers the owl."},
                    {"tier": 2, "hint_text": "Find the noun phrase 'covering of feathers'."},
                    {"tier": 3, "hint_text": "Tap the words 'feathers' or 'covering'."}
                ]
            }
        ],
        2: [
            {
                "exercise_id": "fb_tap_t2_01",
                "topic_title": "Botanical Resilience in Arid Climates",
                "reading_passage": "Desert succulents demonstrate remarkable resilience in extremely arid regions. Despite severe drought and prolonged dry spells, their fleshy tissues store sufficient moisture to survive.",
                "locked_words": [
                    {
                        "word_id": "w1",
                        "word": "arid",
                        "position_index": 6,
                        "correct_clue_ids": ["drought", "dry"],
                        "definition": "Lacking moisture; excessively dry or parched.",
                        "contextual_usage": "Describing desert ecosystems characterized by low precipitation.",
                        "translation": "dry / waterless"
                    }
                ],
                "clue_error_explanations": {
                    "w1__succulents": "'succulents' are the plants growing in the region, not a descriptor of dryness."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Look for words in sentence 2 that describe lack of water."},
                    {"tier": 2, "hint_text": "The clue words are 'drought' and 'dry'."},
                    {"tier": 3, "hint_text": "Tap 'drought' to unlock 'arid'."}
                ]
            }
        ],
        3: [
            {
                "exercise_id": "fb_tap_t3_01",
                "topic_title": "Ephemeral Natural Phenomena",
                "reading_passage": "The desert flower bloom was ephemeral, lasting only three fleeting days before the intense summer heat withered the delicate petals entirely.",
                "locked_words": [
                    {
                        "word_id": "w1",
                        "word": "ephemeral",
                        "position_index": 5,
                        "correct_clue_ids": ["fleeting", "days"],
                        "definition": "Lasting for a very short period; transient or momentary.",
                        "contextual_usage": "Describing the short-lived blooming cycle of arid flora.",
                        "translation": "short-lived / transient"
                    }
                ],
                "clue_error_explanations": {
                    "w1__petals": "'petals' are the plant parts, not an indication of brevity in time."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Look for words indicating how brief or short-lived the bloom was."},
                    {"tier": 2, "hint_text": "Find the adjective meaning passing quickly."},
                    {"tier": 3, "hint_text": "Tap the clue word 'fleeting'."}
                ]
            }
        ]
    },
    'fact_scanner': {
        1: [
            {
                "exercise_id": "fb_fac_t1_01",
                "topic_title": "Evaluating Renewable Power Sources",
                "craap_criterion": "CURRENCY",
                "reading_passage": "Solar panel efficiency has reached record commercial levels according to 2024 industrial reports. Global installation capacity increased by thirty percent over the past calendar year. However, a 1988 telegraph magazine claims that solar panels are too fragile for residential rooftops. Modern micro-inverters provide robust energy conversion even in cloudy climates.",
                "article_sentences": [
                    {
                        "sentence_id": "s1",
                        "text": "Solar panel efficiency has reached record commercial levels according to 2024 industrial reports.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s2",
                        "text": "Global installation capacity increased by thirty percent over the past calendar year.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s3",
                        "text": "However, a 1988 telegraph magazine claims that solar panels are too fragile for residential rooftops.",
                        "is_flawed": True,
                        "flaw_reason": "Cites an obsolete 1988 source (violating Currency) for modern residential solar technology."
                    },
                    {
                        "sentence_id": "s4",
                        "text": "Modern micro-inverters provide robust energy conversion even in cloudy climates.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    }
                ],
                "sentence_explanations": {
                    "s1": "Sentence 1 cites recent 2024 data and satisfies the Currency criterion.",
                    "s2": "Sentence 2 provides contemporary market data.",
                    "s3": "Sentence 3 relies on outdated 1988 information to make a claim about current technology.",
                    "s4": "Sentence 4 describes current engineering practices."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Inspect the publication dates and temporal references in each sentence."},
                    {"tier": 2, "hint_text": "One sentence cites a source published in 1988."},
                    {"tier": 3, "hint_text": "Quarantine sentence s3 due to outdated citation."}
                ]
            }
        ],
        2: [
            {
                "exercise_id": "fb_fac_t2_01",
                "topic_title": "Nutritional Claims in Commercial Advertising",
                "craap_criterion": "AUTHORITY",
                "reading_passage": "Peer-reviewed studies from the National Institute of Health recommend balanced whole food diets. Clinical dietitians emphasize dietary fiber for cardiovascular health. An anonymous social media blogger claims that drinking celery juice cures all chronic diseases permanently. Registered nutritionists warn against unverified dietary fads.",
                "article_sentences": [
                    {
                        "sentence_id": "s1",
                        "text": "Peer-reviewed studies from the National Institute of Health recommend balanced whole food diets.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s2",
                        "text": "Clinical dietitians emphasize dietary fiber for cardiovascular health.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s3",
                        "text": "An anonymous social media blogger claims that drinking celery juice cures all chronic diseases permanently.",
                        "is_flawed": True,
                        "flaw_reason": "Cites an anonymous unverified blogger (violating Authority) lacking medical credentials."
                    },
                    {
                        "sentence_id": "s4",
                        "text": "Registered nutritionists warn against unverified dietary fads.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    }
                ],
                "sentence_explanations": {
                    "s1": "The National Institute of Health is an authoritative scientific body.",
                    "s2": "Clinical dietitians have verified medical training.",
                    "s3": "An anonymous blogger lacks credentials and authority to make medical claims.",
                    "s4": "Registered professionals provide qualified guidance."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Evaluate the credentials and qualifications of each cited source."},
                    {"tier": 2, "hint_text": "Notice which source is anonymous with no medical credentials."},
                    {"tier": 3, "hint_text": "Sentence s3 fails the Authority test."}
                ]
            }
        ],
        3: [
            {
                "exercise_id": "fb_fac_t3_01",
                "topic_title": "Corporate Neutrality in Climate Reporting",
                "craap_criterion": "PURPOSE",
                "reading_passage": "Independent atmospheric researchers measure atmospheric carbon parts per million using satellite spectrometry. Meteorological agencies cross-validate these findings with ice core sample benchmarks. A lobbying group funded by oil extraction corporations published a flyer claiming fossil fuels clean the atmosphere. Academic climate consensus confirms human activity influences global thermal equilibrium.",
                "article_sentences": [
                    {
                        "sentence_id": "s1",
                        "text": "Independent atmospheric researchers measure atmospheric carbon parts per million using satellite spectrometry.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s2",
                        "text": "Meteorological agencies cross-validate these findings with ice core sample benchmarks.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    },
                    {
                        "sentence_id": "s3",
                        "text": "A lobbying group funded by oil extraction corporations published a flyer claiming fossil fuels clean the atmosphere.",
                        "is_flawed": True,
                        "flaw_reason": "Extreme commercial conflict of interest and lobbying propaganda (violating Purpose/Objectivity)."
                    },
                    {
                        "sentence_id": "s4",
                        "text": "Academic climate consensus confirms human activity influences global thermal equilibrium.",
                        "is_flawed": False,
                        "flaw_reason": ""
                    }
                ],
                "sentence_explanations": {
                    "s1": "Independent researchers provide objective empirical data.",
                    "s2": "Cross-validation ensures scientific accuracy.",
                    "s3": "The lobbying publication has a clear promotional bias and commercial purpose.",
                    "s4": "Academic consensus reflects broad objective verification."
                },
                "scaffold_hints": [
                    {"tier": 1, "hint_text": "Examine the motivation and bias behind the information sources."},
                    {"tier": 2, "hint_text": "Look for a financial conflict of interest in sentence s3."},
                    {"tier": 3, "hint_text": "Quarantine sentence s3 for failing the Purpose criterion."}
                ]
            }
        ]
    }
}


def get_fallback_batch(module: str, difficulty: int, count: int = 5) -> List[Dict[str, Any]]:
    """Returns a list of fallback exercises for the given module and difficulty."""
    module_pool = FALLBACK_EXERCISES.get(module, {})
    pool = module_pool.get(difficulty, [])
    if not pool:
        # Fallback to tier 1 if tier not found
        pool = module_pool.get(1, [])
    
    if not pool:
        return []
        
    results = []
    while len(results) < count:
        for item in pool:
            # Create a distinct exercise id per copy
            copied = dict(item)
            copied['exercise_id'] = f"{item['exercise_id']}_{len(results) + 1}"
            results.append(copied)
            if len(results) >= count:
                break
    return results[:count]
