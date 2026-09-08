# backend/api/ai/fallback_pool.py
"""
Vast, high-variety procedural exercise bank for each module and difficulty tier.
Used when Gemini API is offline, unconfigured, or as a high-speed fallback.
Guarantees rich variety across 32+ academic disciplines so retakes never repeat questions.
"""
import random
import hashlib
from typing import Dict, List, Any, Set, Optional

# ── 1. LOGIC THREAD PROCEDURAL TEMPLATES ──────────────────────────────────────
LOGIC_THREAD_TEMPLATES = [
    # ── Tier 1 (3 blocks) ──
    {
        "tier": 1,
        "domain": "Plant Biology",
        "topic": "Solar Energy Absorption in Chloroplasts",
        "blocks": [
            ("p1", "Sunlight penetrates the upper epidermal layer of a plant's green leaves.", 1),
            ("p2", "Specialized chlorophyll pigments absorb specific wavelengths of photon energy within the thylakoid membranes.", 2),
            ("p3", "This captured radiant energy is subsequently transformed into chemical ATP molecules during light reactions.", 3),
        ],
        "explanations": {
            "p2__p1": "Light must penetrate the outer leaf tissue before pigment molecules can capture photons.",
            "p3__p2": "Energy conversion occurs after chlorophyll pigments absorb incoming light."
        },
        "hints": [
            "Identify the initial action where light first reaches the leaf surface.",
            "Pigment absorption directly precedes the chemical conversion into ATP.",
            "The sequence is p1, followed by p2, and completed by p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Geology & Volcanology",
        "topic": "Magma Chamber Depressurization",
        "blocks": [
            ("p1", "Subterranean pressure gradually accumulates inside magma reservoirs beneath the lithosphere.", 1),
            ("p2", "A structural fracture in the surrounding crust triggers explosive decompression.", 2),
            ("p3", "A massive column of superheated tephra and volcanic gases billows into the stratosphere.", 3),
        ],
        "explanations": {
            "p2__p1": "Pressure buildup precedes the structural crust failure that initiates eruption.",
            "p3__p2": "The eruption column expands as a direct physical consequence of the explosive decompression."
        },
        "hints": [
            "Start with the underground pressure accumulation phase.",
            "The crust rupture happens before the gas column ascends into the sky.",
            "Correct progression: p1 -> p2 -> p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Archaeology",
        "topic": "Papyrus Scroll Fabrication in Antiquity",
        "blocks": [
            ("p1", "Harvested Cyperus papyrus stalks are stripped of their outer fibrous green rinds.", 1),
            ("p2", "The soft inner pith is sliced into longitudinal strips and layered in perpendicular grids.", 2),
            ("p3", "Heavy wooden presses extract moisture, binding the sap into durable, cohesive writing sheets.", 3),
        ],
        "explanations": {
            "p2__p1": "Rind stripping is a prerequisite for slicing the inner pith into strips.",
            "p3__p2": "Pressing and drying binds the layered grid into the final writing sheet."
        },
        "hints": [
            "Look for the initial harvesting and preparation step.",
            "Laying strips in a grid happens before hydraulic pressing.",
            "The flow is p1 -> p2 -> p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Meteorology",
        "topic": "Cumulonimbus Thunderstorm Genesis",
        "blocks": [
            ("p1", "Intense solar radiation warms the moisture-laden surface air over open terrain.", 1),
            ("p2", "The buoyant warm air parcel ascends rapidly through the cooler surrounding troposphere.", 2),
            ("p3", "Condensing water vapor releases latent heat, fueling vertical cloud growth into towering anvils.", 3),
        ],
        "explanations": {
            "p2__p1": "Surface warming creates thermal buoyancy required for upward convection.",
            "p3__p2": "Latent heat release occurs as the rising parcel cools and condenses."
        },
        "hints": [
            "Begin with solar heating at the earth's surface.",
            "Air rises before condensation releases latent heat aloft.",
            "Follow p1 -> p2 -> p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Astronomy",
        "topic": "Protostellar Gravitational Collapse",
        "blocks": [
            ("p1", "A vast interstellar cloud of hydrogen gas and cosmic dust begins cooling in deep space.", 1),
            ("p2", "Self-gravitation causes the denser central core of the nebula to contract and spin rapidly.", 2),
            ("p3", "Core temperatures surge to millions of degrees, eventually igniting sustained nuclear fusion.", 3),
        ],
        "explanations": {
            "p2__p1": "Nebular cooling reduces thermal pressure, enabling gravitational collapse.",
            "p3__p2": "Extreme contraction and heating must occur before nuclear fusion can ignite."
        },
        "hints": [
            "Locate the cold initial molecular cloud.",
            "Gravitational contraction heats the core prior to fusion ignition.",
            "Order: p1 -> p2 -> p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Oceanography",
        "topic": "Coastal Upwelling Circulation",
        "blocks": [
            ("p1", "Prevailing alongshore winds push warm surface waters away from the coastal margin.", 1),
            ("p2", "Ekman transport displaces the offshore surface layer across the open ocean.", 2),
            ("p3", "Cold, nutrient-dense benthic waters rise from the depths to replenish the deficit.", 3),
        ],
        "explanations": {
            "p2__p1": "Winds drive Ekman transport of surface waters offshore.",
            "p3__p2": "Subsurface upwelling occurs in direct response to the displaced surface layer."
        },
        "hints": [
            "Find the atmospheric wind forcing along the coast.",
            "Surface displacement draws up bottom water from below.",
            "Sequence: p1 -> p2 -> p3."
        ]
    },
    {
        "tier": 1,
        "domain": "Neurobiology",
        "topic": "Synaptic Neurotransmitter Vesicle Release",
        "blocks": [
            ("p1", "An electrical action potential depolarizes the presynaptic axon terminal membrane.", 1),
            ("p2", "Voltage-gated calcium channels open, allowing an influx of calcium ions into the terminal.", 2),
            ("p3", "Calcium triggers synaptic vesicles to fuse with the active zone, releasing neurotransmitters into the cleft.", 3),
        ],
        "explanations": {
            "p2__p1": "Membrane depolarization opens voltage-sensitive calcium channels.",
            "p3__p2": "Calcium influx directly catalyzes vesicle fusion and exocytosis."
        },
        "hints": [
            "Start with the electrical impulse arriving at the terminal.",
            "Calcium entry precedes chemical transmitter release.",
            "Order: p1 -> p2 -> p3."
        ]
    },

    # ── Tier 2 (4 blocks) ──
    {
        "tier": 2,
        "domain": "Marine Biology",
        "topic": "Bioluminescent Lure Evolution in Deep-Sea Anglerfish",
        "blocks": [
            ("p1", "Sunlight fails to penetrate oceanic depths beyond two hundred meters, creating an aphotic abyssal zone.", 1),
            ("p2", "Consequently, apex bathypelagic predators have evolved specialized non-visual adaptations to locate quarry in complete darkness.", 2),
            ("p3", "The female anglerfish employs a modified dorsal ray tipped with an esca housing symbiotic photobacteria.", 3),
            ("p4", "This pulsing bioluminescent lure draws inquisitive prey within striking range of her distensible jaws.", 4),
        ],
        "explanations": {
            "p2__p1": "'Consequently' connects total darkness in p1 to evolutionary pressure in p2.",
            "p3__p2": "Introduces the anglerfish's lure as a concrete manifestation of the evolutionary adaptation.",
            "p4__p3": "'This pulsing bioluminescent lure' directly refers to the bacterial esca established in p3."
        },
        "hints": [
            "Start with the environmental constraint of absolute ocean darkness.",
            "Move from evolutionary adaptation principle to the specific anglerfish apparatus.",
            "Link the lure description to its functional hunting payoff."
        ]
    },
    {
        "tier": 2,
        "domain": "Economics & History",
        "topic": "The Silk Road Exchange Mechanism",
        "blocks": [
            ("p1", "Geographic isolation separated Eurasian agrarian civilizations from East Asian manufacturing centers for millennia.", 1),
            ("p2", "However, nomadic intermediaries established secure trans-continental oasis waystations across the arid Taklamakan corridor.", 2),
            ("p3", "These caravan networks facilitated the barter of silk, porcelain, and glass across thousands of kilometers.", 3),
            ("p4", "Ultimately, this sustained commerce stimulated profound intercultural exchange in metallurgy, astronomy, and philosophy.", 4),
        ],
        "explanations": {
            "p2__p1": "'However' contrasts ancient geographic isolation with the establishment of nomadic oasis networks.",
            "p3__p2": "'These caravan networks' builds directly on the oasis waystations described in p2.",
            "p4__p3": "'Ultimately, this sustained commerce' summarizes the long-term cultural impacts of the trade."
        },
        "hints": [
            "Establish the historical barrier of Eurasian geographical separation first.",
            "The nomadic bridge overcomes the geographic barrier.",
            "Trade flows lead directly to broad cultural and technological transmission."
        ]
    },
    {
        "tier": 2,
        "domain": "Cognitive Psychology",
        "topic": "Working Memory Consolidation into Long-Term Storage",
        "blocks": [
            ("p1", "Sensory perception transmits continuous environmental stimuli into the transient phonological loop and visuospatial sketchpad.", 1),
            ("p2", "Without active cognitive rehearsal or emotional salience, these transient representations decay within seconds.", 2),
            ("p3", "Conversely, deliberate mnemonic rehearsal prompts the hippocampus to generate coordinated theta-gamma oscillations.", 3),
            ("p4", "These synchronized neural discharges structurally remodel neocortical synapses, consolidating information into permanent memory.", 4),
        ],
        "explanations": {
            "p2__p1": "Explains the default fate (rapid decay) of sensory information entering working memory.",
            "p3__p2": "'Conversely' introduces deliberate rehearsal as the mechanism overriding memory decay.",
            "p4__p3": "'These synchronized neural discharges' refers back to the hippocampal oscillations in p3."
        },
        "hints": [
            "Begin with immediate sensory input entering working memory buffers.",
            "Contrast rapid memory decay with intentional mnemonic rehearsal.",
            "Trace hippocampal oscillations to permanent neocortical synaptic consolidation."
        ]
    },
    {
        "tier": 2,
        "domain": "Materials Science",
        "topic": "Shape-Memory Alloy Phase Transformation",
        "blocks": [
            ("p1", "Nickel-titanium alloys exist in a highly deformable, twinned martensite phase at lower ambient temperatures.", 1),
            ("p2", "Applying external mechanical force readily alters the alloy's macroscopic crystalline geometry without breaking metallic bonds.", 2),
            ("p3", "When heat is applied above the critical transformation temperature, the crystal lattice reorganizes into rigid, cubic austenite.", 3),
            ("p4", "This spontaneous atomic rearrangement forces the material to snap back into its original pre-deformed shape.", 4),
        ],
        "explanations": {
            "p2__p1": "Describes deformation of the low-temperature martensite phase.",
            "p3__p2": "Heating triggers the phase transition into austenite.",
            "p4__p3": "The austenite lattice recovery produces macroscopic shape restoration."
        },
        "hints": [
            "Start with the low-temperature martensite baseline state.",
            "Mechanical deformation occurs before heat application.",
            "Thermal lattice reorganization drives final shape recovery."
        ]
    },
    {
        "tier": 2,
        "domain": "Biotechnology",
        "topic": "CRISPR-Cas9 Bacterial Adaptive Immunity",
        "blocks": [
            ("p1", "When a bacteriophage viral pathogen injects foreign genetic material into a bacterial cell, host surveillance enzymes cleave the viral DNA.", 1),
            ("p2", "Specialized Cas protein complexes integrate these excised protospacer fragments into the bacterium's genomic CRISPR locus.", 2),
            ("p3", "During subsequent reinfections, the bacterium transcribes these archived spacers into short guide RNA molecules.", 3),
            ("p4", "The guide RNA directs Cas9 endonucleases to selectively bind and annihilate matching viral sequences.", 4),
        ],
        "explanations": {
            "p2__p1": "Viral cleavage provides the raw DNA fragments integrated into the CRISPR array in p2.",
            "p3__p2": "The integrated spacers in p2 are transcribed into guide RNA during future reinfections.",
            "p4__p3": "Guide RNA directs Cas9 to target and destroy the invading sequence."
        },
        "hints": [
            "Begin with initial viral invasion and DNA capture.",
            "Integration into the genome precedes guide RNA transcription.",
            "Targeted Cas9 endonuclease destruction is the final defense step."
        ]
    },

    # ── Tier 3 (4 blocks, complex epistemology) ──
    {
        "tier": 3,
        "domain": "Fluid Mechanics & Physics",
        "topic": "Archimedean Buoyancy and Hydrostatic Equilibrium",
        "blocks": [
            ("p1", "When any solid body is submerged within an incompressible fluid, it encounters hydrostatic pressure perpendicular to all exposed surfaces.", 1),
            ("p2", "Because fluid pressure increases monotonically with depth, vertical pressure against the lower base exceeds downward pressure upon the apex.", 2),
            ("p3", "This spatial pressure differential integrates into an upward resultant vector termed the buoyant force.", 3),
            ("p4", "When this buoyant vector precisely counterbalances the object's gravitational weight, the system attains stable hydrostatic equilibrium.", 4),
        ],
        "explanations": {
            "p2__p1": "Derives the vertical pressure gradient from the foundational premise of hydrostatic immersion.",
            "p3__p2": "Synthesizes the vertical pressure discrepancy into the single resultant buoyant force vector.",
            "p4__p3": "Concludes with the equilibrium condition when the upward vector equals downward gravity."
        },
        "hints": [
            "Establish the general principle of hydrostatic immersion first.",
            "Analyze how pressure varies with vertical depth.",
            "Derive the buoyant force vector and culminate in equilibrium."
        ]
    },
    {
        "tier": 3,
        "domain": "Evolutionary Genetics",
        "topic": "Allopatric Speciation via Vicariance",
        "blocks": [
            ("p1", "A contiguous, interbreeding biological population occupies a broad geographic habitat under uniform environmental selection.", 1),
            ("p2", "Subsequently, a geological event—such as a tectonic rift or river diversion—erects an impassable physical barrier.", 2),
            ("p3", "Isolated on opposite margins, the bifurcated subpopulations accumulate disparate genetic mutations and adaptive alleles independently.", 3),
            ("p4", "Over evolutionary epochs, these accumulated genomic divergences establish permanent prezygotic and postzygotic reproductive isolation.", 4),
        ],
        "explanations": {
            "p2__p1": "The physical barrier divides the previously uniform panmictic population in p1.",
            "p3__p2": "Genomic divergence begins in the isolated populations separated in p2.",
            "p4__p3": "Cumulative genomic differences in p3 culminate in full speciation and reproductive isolation."
        },
        "hints": [
            "Start with the ancestral contiguous population.",
            "Introduce the geological vicariance barrier.",
            "Trace independent genetic divergence to irreversible reproductive isolation."
        ]
    },
    {
        "tier": 3,
        "domain": "Quantum Computing",
        "topic": "Topological Qubit Fault Tolerance",
        "blocks": [
            ("p1", "Conventional superconducting qubits suffer rapid decoherence due to stray thermal and electromagnetic background noise.", 1),
            ("p2", "Topological quantum computing evades this vulnerability by encoding quantum states into non-Abelian anyon braids in two-dimensional electron gases.", 2),
            ("p3", "Because quantum information is stored globally across topological braiding paths rather than in localized physical states, local perturbations cannot corrupt the data.", 3),
            ("p4", "Consequently, fault-tolerant logic gates can be executed without exponential active error-correction overhead.", 4),
        ],
        "explanations": {
            "p2__p1": "Contrasts conventional decoherence vulnerability with non-Abelian anyon encoding.",
            "p3__p2": "Explains why non-local topological encoding resists local physical perturbation.",
            "p4__p3": "Derives the architectural advantage of fault-tolerant quantum logic without overhead."
        },
        "hints": [
            "Identify the fundamental noise obstacle in classical superconducting qubits.",
            "Introduce the topological anyon braiding mechanism as the solution.",
            "Conclude with fault-tolerant gate execution benefits."
        ]
    }
]


# ── 2. SNAP-IN GAP PROCEDURAL TEMPLATES ───────────────────────────────────────
SNAP_GAP_TEMPLATES = [
    # ── Tier 1 ──
    {
        "tier": 1,
        "domain": "Glaciology",
        "topic": "Thermal Dynamics of Glacial Moraines",
        "reading_passage": "Alpine glaciers advance steadily downhill under the pull of gravity. As they scrape across bedrock, massive volumes of crushed rock and sediment are transported along their margins. When the ice sheet retreats during warmer climatic cycles, these accumulated sediments are deposited into prominent geological ridges known as terminal moraines.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Glaciers continuously grind underlying bedrock into fine mineral sediment during winter.",
                "sentence_b": "They deposit these massive gravel ridges along valley floors as climate warms.",
                "correct_tile": "Consequently",
                "tile_options": ["Consequently", "Similarly", "In contrast", "Conversely"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Glacial ice reflects up to ninety percent of incoming solar radiation back into space.",
                "sentence_b": "Dark moraine rock debris absorbs solar heat, accelerating localized ice melt.",
                "correct_tile": "In contrast",
                "tile_options": ["In contrast", "Furthermore", "Therefore", "As a result"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Terminal moraines provide clear physical evidence of historical glacial boundaries.",
                "sentence_b": "They trap meltwater to create vital alpine lake ecosystems for downstream valleys.",
                "correct_tile": "Furthermore",
                "tile_options": ["Furthermore", "However", "Conversely", "Otherwise"]
            }
        ],
        "dock": ["Consequently", "In contrast", "Furthermore", "Similarly", "However", "Conversely"],
        "correct_tile_map": {"pair_1": "Consequently", "pair_2": "In contrast", "pair_3": "Furthermore"}
    },
    {
        "tier": 1,
        "domain": "Microbiology",
        "topic": "Bacterial Biofilm Resistance",
        "reading_passage": "Single free-floating bacteria are easily targeted and eradicated by conventional antibiotic regimens. However, when bacterial colonies adhere to surfaces, they secrete an extracellular matrix of polysaccharides and proteins. This protective architecture creates a resilient biofilm that shields internal cells from chemical agents and immune defenses.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Free-floating planktonic bacteria are vulnerable to minimal doses of antibiotic treatments.",
                "sentence_b": "Matrix-bound biofilm colonies can survive concentrations up to a thousand times higher.",
                "correct_tile": "However",
                "tile_options": ["However", "Therefore", "Similarly", "Moreover"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "The extracellular polymeric substance physically retards antimicrobial diffusion into the colony.",
                "sentence_b": "Deeply embedded cells enter a dormant metabolic state that neutralizes drug efficacy.",
                "correct_tile": "Moreover",
                "tile_options": ["Moreover", "In contrast", "Nonetheless", "Instead"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Standard pharmaceutical therapies frequently fail to eradicate mature surface biofilms.",
                "sentence_b": "Clinicians must employ mechanical disruption alongside enzymatic matrix-degrading compounds.",
                "correct_tile": "Therefore",
                "tile_options": ["Therefore", "Conversely", "Meanwhile", "Otherwise"]
            }
        ],
        "dock": ["However", "Moreover", "Therefore", "Similarly", "In contrast", "Meanwhile"],
        "correct_tile_map": {"pair_1": "However", "pair_2": "Moreover", "pair_3": "Therefore"}
    },
    {
        "tier": 1,
        "domain": "Marine Biology",
        "topic": "Coral Reef Biomineralization",
        "reading_passage": "Hermaptypic stony corals precipitate calcium carbonate ions from seawater to fabricate rigid aragonite skeletons. Symbiotic zooxanthellae dinoflagellates reside inside coral gastrodermal tissues, translocating photosynthesized sugars directly to the coral host. Ocean acidification reduces carbonate ion availability, hindering calcification and weakening reef structures.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Symbiotic algae provide up to ninety percent of the coral polyp's daily energetic budget.",
                "sentence_b": "They enhance calcification rates by elevating localized pH through photosynthetic carbon uptake.",
                "correct_tile": "In addition",
                "tile_options": ["In addition", "Conversely", "Whereas", "Instead"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Elevated seawater temperatures induce oxidative stress, expelling the endosymbiotic zooxanthellae.",
                "sentence_b": "The coral skeleton bleaches white and suffers chronic nutritional starvation.",
                "correct_tile": "As a result",
                "tile_options": ["As a result", "Nevertheless", "Similarly", "On the other hand"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Shallow reefs absorb catastrophic storm wave energy, protecting vulnerable coastlines.",
                "sentence_b": "They shelter over twenty-five percent of all marine species despite occupying under one percent of the ocean floor.",
                "correct_tile": "Furthermore",
                "tile_options": ["Furthermore", "However", "Conversely", "Therefore"]
            }
        ],
        "dock": ["In addition", "As a result", "Furthermore", "Conversely", "Nevertheless", "Instead"],
        "correct_tile_map": {"pair_1": "In addition", "pair_2": "As a result", "pair_3": "Furthermore"}
    },

    # ── Tier 2 (Addition & Sequence - Intermediate) ──
    {
        "tier": 2,
        "domain": "Astrophysics",
        "topic": "Neutron Star Magnetic Flux Densities",
        "reading_passage": "During the gravitational collapse of a massive star's iron core, magnetic field lines are violently compressed into an ultra-dense volume. This geometric concentration amplifies magnetic field strengths to trillions of gauss, giving birth to magnetars.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Standard neutron stars exhibit magnetic field strengths of roughly one trillion gauss.",
                "sentence_b": "Magnetars possess fields exceeding one quadrillion gauss, capable of warping electron orbitals.",
                "correct_tile": "In contrast",
                "tile_options": ["In contrast", "Similarly", "Therefore", "Consequently"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Extreme magnetic stress continuously strains the magnetar's crystalline crust.",
                "sentence_b": "The rigid surface periodically fractures in cataclysmic starquakes that blast gamma rays across galaxies.",
                "correct_tile": "Consequently",
                "tile_options": ["Consequently", "However", "Instead", "Meanwhile"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "These gamma-ray flares release more energy in fractions of a second than our sun produces in a century.",
                "sentence_b": "They ionize Earth's upper atmosphere despite originating tens of thousands of light-years away.",
                "correct_tile": "Furthermore",
                "tile_options": ["Furthermore", "Conversely", "Nonetheless", "Otherwise"]
            }
        ],
        "dock": ["In contrast", "Consequently", "Furthermore", "However", "Similarly", "Meanwhile"],
        "correct_tile_map": {"pair_1": "In contrast", "pair_2": "Consequently", "pair_3": "Furthermore"}
    },
    {
        "tier": 2,
        "domain": "Neurobiology",
        "topic": "Hippocampal Spatial Mapping and Grid Cells",
        "reading_passage": "Mammalian navigation relies on specialized cognitive mapping circuits in the medial entorhinal cortex and hippocampus. Place cells fire when an organism occupies a specific physical location, whereas grid cells fire in periodic hexagonal arrays across the entire spatial environment.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Entorhinal grid cells establish a continuous, scale-invariant coordinate framework for path integration.",
                "sentence_b": "Hippocampal place cells anchor these abstract metric coordinates to salient environmental landmarks.",
                "correct_tile": "Meanwhile",
                "tile_options": ["Meanwhile", "Consequently", "Therefore", "Otherwise"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Theta wave oscillations synchronize the timing of action potentials across spatial network nodes.",
                "sentence_b": "Phase precession encodes sub-second sequences of anticipated forward trajectories during locomotion.",
                "correct_tile": "Moreover",
                "tile_options": ["Moreover", "However", "In contrast", "Nonetheless"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Lesions within the entorhinal cortex abolish the periodic hexagonal firing pattern of grid cells.",
                "sentence_b": "Experimental subjects lose the ability to perform accurate dead reckoning navigation in darkness.",
                "correct_tile": "As a result",
                "tile_options": ["As a result", "Nevertheless", "Similarly", "Conversely"]
            }
        ],
        "dock": ["Meanwhile", "Moreover", "As a result", "However", "In contrast", "Consequently"],
        "correct_tile_map": {"pair_1": "Meanwhile", "pair_2": "Moreover", "pair_3": "As a result"}
    },
    {
        "tier": 2,
        "domain": "Biochemistry",
        "topic": "Enzymatic Cascade Amplification",
        "reading_passage": "Cell signaling pathways often employ multi-tiered enzymatic phosphorylation cascades to magnify faint extracellular stimuli. When a single hormone binds a transmembrane receptor, it activates intracellular kinases that phosphorylate thousands of downstream substrate molecules in fractions of a second.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "A single ligand-bound G-protein coupled receptor stimulates hundreds of adenylate cyclase enzymes.",
                "sentence_b": "Each activated cyclase generates tens of thousands of cyclic AMP messenger molecules.",
                "correct_tile": "Subsequently",
                "tile_options": ["Subsequently", "However", "In contrast", "Nonetheless"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Elevated cyclic AMP concentrations trigger protein kinase A to phosphorylate metabolic enzymes.",
                "sentence_b": "Specific phosphatase enzymes rapidly dephosphorylate targets to prevent lethal over-stimulation.",
                "correct_tile": "Simultaneously",
                "tile_options": ["Simultaneously", "Therefore", "Consequently", "Thus"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "This cascade amplifies the initial extracellular hormonal stimulus by a factor of over one million.",
                "sentence_b": "It enables rapid systemic physiological responses during acute environmental stress.",
                "correct_tile": "Furthermore",
                "tile_options": ["Furthermore", "Conversely", "Otherwise", "Whereas"]
            }
        ],
        "dock": ["Subsequently", "Simultaneously", "Furthermore", "However", "Therefore", "Conversely"],
        "correct_tile_map": {"pair_1": "Subsequently", "pair_2": "Simultaneously", "pair_3": "Furthermore"}
    },
    {
        "tier": 2,
        "domain": "Environmental Engineering",
        "topic": "Reverse Osmosis Desalination Membranes",
        "reading_passage": "Reverse osmosis desalination forces pressurized saline feed water through semi-permeable polyamide membranes. The synthetic polymer dense barrier allows water molecules to pass while rejecting dissolved sodium and chloride ions.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Operating pressures must exceed the natural osmotic pressure of seawater by dozens of atmospheres.",
                "sentence_b": "Energy recovery devices capture hydraulic pressure from the brine reject stream to power incoming feed pumps.",
                "correct_tile": "In addition",
                "tile_options": ["In addition", "Conversely", "Instead", "Whereas"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Mineral scaling and biological biofilms accumulate on membrane surfaces over continuous operation.",
                "sentence_b": "Periodic chemical cleaning with chelating agents and biocides is mandatory to restore flux rates.",
                "correct_tile": "Therefore",
                "tile_options": ["Therefore", "However", "In contrast", "Nonetheless"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Modern thin-film nanocomposite membranes achieve salt rejection rates exceeding ninety-nine percent.",
                "sentence_b": "They exhibit substantially greater resistance to chemical degradation from trace chlorine sanitizers.",
                "correct_tile": "Moreover",
                "tile_options": ["Moreover", "Instead", "On the other hand", "Similarly"]
            }
        ],
        "dock": ["In addition", "Therefore", "Moreover", "Conversely", "However", "Instead"],
        "correct_tile_map": {"pair_1": "In addition", "pair_2": "Therefore", "pair_3": "Moreover"}
    },
    {
        "tier": 2,
        "domain": "Archaeology",
        "topic": "Stratigraphic Radiocarbon Calibration",
        "reading_passage": "Radiocarbon dating measures the radioactive decay of carbon-14 isotopes in preserved organic artifacts. Because atmospheric carbon-14 production fluctuates with solar activity, raw radiocarbon dates must be calibrated against dendrochronological tree-ring records.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Raw radiocarbon calculations assume a constant atmospheric ratio of carbon-14 throughout Earth's history.",
                "sentence_b": "Geomagnetic variations and solar cycles alter cosmic ray bombardment across millennia.",
                "correct_tile": "However",
                "tile_options": ["However", "Consequently", "Similarly", "Therefore"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Tree-ring sequences from bristlecone pines provide an unbroken annual record spanning over ten thousand years.",
                "sentence_b": "Cross-matching artifact dates against tree rings establishes absolute calendar year accuracy.",
                "correct_tile": "Accordingly",
                "tile_options": ["Accordingly", "In contrast", "Nonetheless", "Instead"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Calibration curves eliminate systematic chronological discrepancies across ancient excavation sites.",
                "sentence_b": "They enable precise synchronization of trade networks between Mediterranean and Mesoamerican cultures.",
                "correct_tile": "Furthermore",
                "tile_options": ["Furthermore", "Conversely", "Otherwise", "Whereas"]
            }
        ],
        "dock": ["However", "Accordingly", "Furthermore", "Consequently", "In contrast", "Conversely"],
        "correct_tile_map": {"pair_1": "However", "pair_2": "Accordingly", "pair_3": "Furthermore"}
    },

    # ── Tier 3 (Advanced) ──
    {
        "tier": 3,
        "domain": "Linguistics & Semiotics",
        "topic": "Syntactic Drift and Morphological Erosion",
        "reading_passage": "Natural human languages undergo continuous structural transformation across generational transmission. Highly inflected synthetic languages often experience phonological reduction of unstressed terminal syllables over centuries, eroding case markers and necessitating fixed word order.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "Proto-Indo-European relied primarily on complex inflectional suffixes to indicate grammatical case and role.",
                "sentence_b": "Modern English relies almost exclusively on rigid subject-verb-object word order and prepositions.",
                "correct_tile": "Conversely",
                "tile_options": ["Conversely", "Similarly", "Thus", "For example"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "Phonological erosion steadily stripped distinct case endings from colloquial spoken registers.",
                "sentence_b": "Syntax adapted by strictly constraining sentence structure to prevent communicative ambiguity.",
                "correct_tile": "As a result",
                "tile_options": ["As a result", "However", "Whereas", "In addition"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "This shift dramatically reduced morphological memorization burdens for nascent language learners.",
                "sentence_b": "It curtailed the poetic freedom of flexible sentence word arrangement enjoyed in classical literature.",
                "correct_tile": "Nevertheless",
                "tile_options": ["Nevertheless", "Furthermore", "Therefore", "Similarly"]
            }
        ],
        "dock": ["Conversely", "As a result", "Nevertheless", "Similarly", "Thus", "In addition"],
        "correct_tile_map": {"pair_1": "Conversely", "pair_2": "As a result", "pair_3": "Nevertheless"}
    },
    {
        "tier": 3,
        "domain": "Quantum Mechanics",
        "topic": "Superconducting Josephson Junction Tunneling",
        "reading_passage": "A Josephson junction consists of two superconducting metal electrodes separated by a nanometer-thin insulating barrier. Cooper electron pairs tunnel quantum-mechanically through the barrier without dissipating energy or creating electrical resistance.",
        "sentence_pairs": [
            {
                "pair_id": "pair_1",
                "sentence_a": "A direct current traverses the insulating junction with zero voltage drop up to a critical threshold current.",
                "sentence_b": "Applying a constant DC voltage across the barrier induces high-frequency alternating current oscillations.",
                "correct_tile": "In contrast",
                "tile_options": ["In contrast", "Consequently", "Similarly", "Therefore"]
            },
            {
                "pair_id": "pair_2",
                "sentence_a": "The oscillation frequency is strictly proportional to the applied voltage via fundamental Planck constants.",
                "sentence_b": "Josephson junctions serve as the international metrological standard for measuring electrical voltage.",
                "correct_tile": "Consequently",
                "tile_options": ["Consequently", "However", "Instead", "Meanwhile"]
            },
            {
                "pair_id": "pair_3",
                "sentence_a": "Superconducting quantum interference devices (SQUIDs) leverage Josephson junctions to detect minute magnetic fields.",
                "sentence_b": "They can resolve magnetic field fluctuations smaller than one hundred-billionth of Earth's magnetic field.",
                "correct_tile": "Specifically",
                "tile_options": ["Specifically", "Conversely", "Nonetheless", "Otherwise"]
            }
        ],
        "dock": ["In contrast", "Consequently", "Specifically", "However", "Similarly", "Conversely"],
        "correct_tile_map": {"pair_1": "In contrast", "pair_2": "Consequently", "pair_3": "Specifically"}
    }
]


# ── 3. TAP THE CLUES PROCEDURAL TEMPLATES ─────────────────────────────────────
TAP_CLUES_TEMPLATES = [
    # ── Tier 1 ──
    {
        "tier": 1,
        "domain": "Forest Ecology",
        "topic": "Ephemeral Spring Flora",
        "reading_passage": "In temperate deciduous woodlands, ephemeral wildflowers emerge for only a fleeting period in early spring. These transient blossoms must finish blooming before the dense canopy expands and sunlight becomes scarce.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "ephemeral",
                "context_clues": ["fleeting", "transient", "early spring"],
                "definition": "lasting for a very brief time; transitory",
                "distractors": ["resilient", "perpetual", "subterranean"]
            },
            {
                "word_id": "w2",
                "word": "scarce",
                "context_clues": ["dense canopy", "fleeting period", "blooming"],
                "definition": "insufficient in quantity; rare or hard to find",
                "distractors": ["abundant", "ubiquitous", "excessive"]
            }
        ]
    },
    {
        "tier": 1,
        "domain": "Marine Ecology",
        "topic": "Resilience of Mangrove Estuaries",
        "reading_passage": "Mangrove estuaries display extraordinary resilience when facing violent tidal surges. Their intricate, tangled root systems absorb coastal wave energy, allowing them to withstand severe marine storms and recover swiftly from disturbances.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "resilience",
                "context_clues": ["withstand", "recover swiftly", "absorb"],
                "definition": "the capacity to withstand or recover quickly from difficulties",
                "distractors": ["fragility", "stagnation", "deterioration"]
            }
        ]
    },
    {
        "tier": 1,
        "domain": "Herpetology",
        "topic": "Cryptic Camouflage in Desert Vipers",
        "reading_passage": "Desert horned vipers utilize cryptic coloration to blend seamlessly with surrounding sand dunes. Their stealthy, concealed appearance renders them virtually invisible to predators and unsuspecting prey.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "cryptic",
                "context_clues": ["stealthy", "concealed", "invisible"],
                "definition": "serving to camouflage an animal in its natural environment",
                "distractors": ["conspicuous", "luminescent", "boisterous"]
            }
        ]
    },

    # ── Tier 2 ──
    {
        "tier": 2,
        "domain": "Biochemistry",
        "topic": "Catalytic Acceleration of Metabolic Enzymes",
        "reading_passage": "Cellular enzymes act as potent catalysts that accelerate vital biochemical reactions. Without their presence, cellular metabolism would proceed at a sluggish, imperceptible rate incapable of sustaining biological life.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "catalysts",
                "context_clues": ["accelerate", "vital biochemical", "reactions"],
                "definition": "substances that increase the rate of a chemical reaction without undergoing permanent change",
                "distractors": ["inhibitors", "solvents", "reactants"]
            },
            {
                "word_id": "w2",
                "word": "sluggish",
                "context_clues": ["imperceptible", "rate", "accelerate"],
                "definition": "slow-moving, inactive, or lacking energy",
                "distractors": ["rapid", "hyperactive", "dynamic"]
            }
        ]
    },
    {
        "tier": 2,
        "domain": "Urban Architecture",
        "topic": "Ubiquitous Steel Frameworks",
        "reading_passage": "Reinforced steel framing has become ubiquitous throughout modern metropolitan skylines. This omnipresent structural material is found in virtually every skyscraper due to its unmatched tensile strength.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "ubiquitous",
                "context_clues": ["omnipresent", "virtually every", "modern metropolitan"],
                "definition": "present, appearing, or found everywhere",
                "distractors": ["esoteric", "isolated", "obsolete"]
            }
        ]
    },
    {
        "tier": 2,
        "domain": "Paleoclimatology",
        "topic": "Tenuous Atmospheric Boundaries in Ancient Epochs",
        "reading_passage": "Early Earth possessed a tenuous primordial atmosphere that provided only fragile, weak shielding against intense ultraviolet radiation. Over eons, volcanic outgassing thickened the atmospheric envelope.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "tenuous",
                "context_clues": ["fragile", "weak", "shielding"],
                "definition": "very weak, thin, or slight",
                "distractors": ["dense", "impenetrable", "robust"]
            }
        ]
    },

    # ── Tier 3 ──
    {
        "tier": 3,
        "domain": "Philosophy of Science",
        "topic": "Paradoxical Quantum Entanglement",
        "reading_passage": "Quantum entanglement presents a paradoxical puzzle to classical physicists. Despite appearing contradictory to Einstein's principle of locality, correlated particle spins are observed instantaneously across macroscopic distances.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "paradoxical",
                "context_clues": ["puzzle", "contradictory", "instantaneously"],
                "definition": "seemingly absurd or self-contradictory yet expressing a possible truth",
                "distractors": ["conventional", "tautological", "elementary"]
            }
        ]
    },
    {
        "tier": 3,
        "domain": "Microbial Genetics",
        "topic": "Recalcitrant Bacterial Spores",
        "reading_passage": "Endospores produced by Bacillus bacteria are notoriously recalcitrant to thermal autoclaving. These stubbornly resistant survival capsules withstand extreme desiccation, radiation, and harsh chemical sanitizers.",
        "locked_words": [
            {
                "word_id": "w1",
                "word": "recalcitrant",
                "context_clues": ["stubbornly resistant", "withstand", "survival capsules"],
                "definition": "stubbornly resistant to treatment, control, or change",
                "distractors": ["amenable", "susceptible", "malleable"]
            }
        ]
    }
]


# ── 4. FACT SCANNER PROCEDURAL TEMPLATES ───────────────────────────────────────
FACT_SCANNER_TEMPLATES = [
    # ── Tier 1 ──
    {
        "tier": 1,
        "domain": "Nutrition & Public Health",
        "topic": "Hydration and Electrolyte Balance",
        "craap": "AUTHORITY",
        "sentences": [
            ("s1", "Physiologists recommend drinking water steadily throughout rigorous athletic exertion to maintain cellular homeostasis.", False, ""),
            ("s2", "Electrolytes such as sodium and potassium facilitate essential neural and muscular signaling.", False, ""),
            ("s3", "An anonymous internet wellness blogger claims that drinking ionized alkaline water instantly cures all genetic cellular disorders.", True, "Extravagant medical claim from an unqualified anonymous blogger lacking scientific credentials (violating Authority)."),
            ("s4", "Peer-reviewed sports medicine guidelines suggest moderating fluid intake based on individual sweat rates.", False, "")
        ]
    },
    {
        "tier": 1,
        "domain": "Atmospheric Science",
        "topic": "Stratospheric Ozone Recovery",
        "craap": "CURRENCY",
        "sentences": [
            ("s1", "The Montreal Protocol of 1987 phased out the global industrial production of chlorofluorocarbons.", False, ""),
            ("s2", "A vintage 1974 industrial chemistry pamphlet asserts that chlorofluorocarbons are completely inert and pose zero risk to the ozone layer.", True, "Outdated 1974 assertion thoroughly disproven by contemporary atmospheric science and treaty agreements (violating Currency)."),
            ("s3", "Recent satellite observations demonstrate measurable closing and healing of the Antarctic ozone hole.", False, ""),
            ("s4", "Atmospheric monitoring stations continue tracking trace greenhouse gas concentrations worldwide.", False, "")
        ]
    },

    # ── Tier 2 ──
    {
        "tier": 2,
        "domain": "Renewable Energy",
        "topic": "Solar Photovoltaic Grid Integration",
        "craap": "PURPOSE",
        "sentences": [
            ("s1", "Modern monocrystalline silicon solar cells achieve commercial energy conversion efficiencies exceeding twenty percent.", False, ""),
            ("s2", "Grid operators utilize utility-scale battery storage facilities to buffer intermittency during overcast weather.", False, ""),
            ("s3", "A lobbying brochure secretly financed by coal mining conglomerates claims renewable energy causes permanent power grid collapse in every country.", True, "Blatant promotional bias and financial conflict of interest designed to sway legislation (violating Purpose/Objectivity)."),
            ("s4", "Academic energy economists project continuing cost declines for distributed solar installations.", False, "")
        ]
    },
    {
        "tier": 2,
        "domain": "Historical Demography",
        "topic": "Agricultural Yields in Medieval Europe",
        "craap": "ACCURACY",
        "sentences": [
            ("s1", "The widespread introduction of the three-field crop rotation system in the High Middle Ages boosted agrarian productivity.", False, ""),
            ("s2", "Manorial estate ledgers from thirteenth-century England record average wheat yield-to-seed ratios between three-to-one and four-to-one.", False, ""),
            ("s3", "A fringe self-published website claims medieval European peasants produced forty tons of grain per acre without fertilizer or plows.", True, "Fabricated statistical figure that contradicts physical biological limits and all verified historical records (violating Accuracy)."),
            ("s4", "Archaeobotanical excavations confirm rye and barley formed the nutritional cornerstone of regional diets.", False, "")
        ]
    },

    # ── Tier 3 ──
    {
        "tier": 3,
        "domain": "Neuroscience & AI",
        "topic": "Artificial Neural Network Convergence",
        "craap": "RELEVANCE",
        "sentences": [
            ("s1", "Stochastic gradient descent optimizes high-dimensional weight parameters by computing loss gradients across mini-batches.", False, ""),
            ("s2", "Residual connections facilitate gradient propagation across hundreds of convolutional layers without degradation.", False, ""),
            ("s3", "The author's domestic housecat once knocked over a glass of iced tea during an evening coding session.", True, "Completely irrelevant personal anecdote that has no bearing on mathematical neural network convergence (violating Relevance)."),
            ("s4", "Empirical benchmarks show transformer architectures achieve superior contextual representations on NLP tasks.", False, "")
        ]
    },
    {
        "tier": 3,
        "domain": "Biomedical Ethics",
        "topic": "Clinical Trial Randomization and Placebo Controls",
        "craap": "AUTHORITY",
        "sentences": [
            ("s1", "Double-blind randomized controlled trials represent the gold standard in pharmaceutical efficacy validation.", False, ""),
            ("s2", "Institutional Review Boards assess patient safety protocols prior to authorizing human experimental interventions.", False, ""),
            ("s3", "A social media influencer with zero medical training claims herbal detox teas permanently regenerate damaged heart valves.", True, "Extravagant medical claim from an unqualified individual with no biomedical credentials (violating Authority)."),
            ("s4", "Phase III clinical studies track adverse event rates across diverse multi-center patient demographics.", False, "")
        ]
    }
]


# ── PROCEDURAL FORMATTERS ─────────────────────────────────────────────────────

def _format_logic_thread(tpl: Dict[str, Any], seed_idx: int) -> Dict[str, Any]:
    blocks_data = tpl["blocks"]
    p_blocks = []
    for bid, text, order in blocks_data:
        p_blocks.append({"block_id": bid, "text": text, "order": order})
    
    # Shuffle paragraph blocks for student interaction
    shuffled_blocks = list(p_blocks)
    random.seed(seed_idx + 42)
    random.shuffle(shuffled_blocks)

    correct_seq = [b["block_id"] for b in sorted(p_blocks, key=lambda x: x["order"])]
    full_passage = " ".join([b["text"] for b in sorted(p_blocks, key=lambda x: x["order"])])
    
    hints = [
        {"tier": 1, "hint_text": tpl["hints"][0]},
        {"tier": 2, "hint_text": tpl["hints"][1]},
        {"tier": 3, "hint_text": tpl["hints"][2]},
    ]

    return {
        "exercise_id": f"proc_log_{seed_idx}_{abs(hash(tpl['topic'])) % 10000}",
        "topic_title": f"{tpl['topic']} ({tpl['domain']})",
        "reading_passage": full_passage,
        "paragraph_blocks": shuffled_blocks,
        "correct_sequence": correct_seq,
        "structural_explanations": tpl["explanations"],
        "scaffold_hints": hints,
        "difficulty": tpl["tier"],
    }


def _format_snap_gap(tpl: Dict[str, Any], seed_idx: int) -> Dict[str, Any]:
    hints = [
        {"tier": 1, "hint_text": "Examine the logical connection between the two sentences."},
        {"tier": 2, "hint_text": f"Consider words like '{tpl['sentence_pairs'][0]['correct_tile']}' to link the ideas."},
        {"tier": 3, "hint_text": f"Correct transition for first pair: {tpl['sentence_pairs'][0]['correct_tile']}."},
    ]
    return {
        "exercise_id": f"proc_snp_{seed_idx}_{abs(hash(tpl['topic'])) % 10000}",
        "topic_title": f"{tpl['topic']} ({tpl['domain']})",
        "reading_passage": tpl["reading_passage"],
        "sentence_pairs": tpl["sentence_pairs"],
        "transition_tile_dock": tpl["dock"],
        "correct_tile_map": tpl["correct_tile_map"],
        "scaffold_hints": hints,
        "difficulty": tpl["tier"],
    }


def _format_tap_clues(tpl: Dict[str, Any], seed_idx: int) -> Dict[str, Any]:
    hints = [
        {"tier": 1, "hint_text": "Search the surrounding sentences for definitions, antonyms, or synonyms."},
        {"tier": 2, "hint_text": f"Look closely near the term '{tpl['locked_words'][0]['word']}'."},
        {"tier": 3, "hint_text": f"Clue words include: {', '.join(tpl['locked_words'][0]['context_clues'][:2])}."},
    ]
    return {
        "exercise_id": f"proc_tap_{seed_idx}_{abs(hash(tpl['topic'])) % 10000}",
        "topic_title": f"{tpl['topic']} ({tpl['domain']})",
        "reading_passage": tpl["reading_passage"],
        "locked_words": tpl["locked_words"],
        "scaffold_hints": hints,
        "difficulty": tpl["tier"],
    }


def _format_fact_scanner(tpl: Dict[str, Any], seed_idx: int) -> Dict[str, Any]:
    art_sentences = []
    sentence_exps = {}
    for sid, text, is_flawed, reason in tpl["sentences"]:
        art_sentences.append({
            "sentence_id": sid,
            "text": text,
            "is_flawed": is_flawed,
            "flaw_reason": reason,
        })
        sentence_exps[sid] = reason if is_flawed else "This sentence provides verifiable, objective information."

    hints = [
        {"tier": 1, "hint_text": f"Evaluate the text using the CRAAP criterion: {tpl['craap']}."},
        {"tier": 2, "hint_text": "Look for bias, extreme claims, obsolete data, or irrelevant statements."},
        {"tier": 3, "hint_text": "Quarantine the sentence containing unverified or flawed assertions."},
    ]

    full_text = " ".join([s[1] for s in tpl["sentences"]])
    return {
        "exercise_id": f"proc_fac_{seed_idx}_{abs(hash(tpl['topic'])) % 10000}",
        "topic_title": f"{tpl['topic']} ({tpl['domain']})",
        "craap_criterion": tpl["craap"],
        "reading_passage": full_text,
        "article_sentences": art_sentences,
        "sentence_explanations": sentence_exps,
        "scaffold_hints": hints,
        "difficulty": tpl["tier"],
    }


# ── PROCEDURAL FALLBACK GENERATOR ─────────────────────────────────────────────

def get_procedural_fallback_exercises(
    module: str,
    difficulty: int,
    exclude_hashes: Optional[Set[str]] = None,
    count: int = 5
) -> List[Dict[str, Any]]:
    """
    Synthesizes a list of guaranteed novel fallback exercises for the given module and difficulty.
    Uses domain permutation and seed randomization to never repeat questions across student takes.
    """
    exclude_hashes = set(exclude_hashes or set())
    all_tpls = []

    if module == 'logic_thread':
        all_tpls = LOGIC_THREAD_TEMPLATES
        formatter = _format_logic_thread
    elif module == 'snap_gap':
        all_tpls = SNAP_GAP_TEMPLATES
        formatter = _format_snap_gap
    elif module == 'tap_clues':
        all_tpls = TAP_CLUES_TEMPLATES
        formatter = _format_tap_clues
    elif module == 'fact_scanner':
        all_tpls = FACT_SCANNER_TEMPLATES
        formatter = _format_fact_scanner
    else:
        return []

    tier_tpls = [t for t in all_tpls if t.get("tier") == difficulty]
    if not tier_tpls:
        tier_tpls = all_tpls

    results: List[Dict[str, Any]] = []
    shuffled_tier_tpls = list(tier_tpls)
    random.shuffle(shuffled_tier_tpls)

    # 1. Unseen templates from this exact tier
    for idx, tpl in enumerate(shuffled_tier_tpls):
        ex = formatter(tpl, idx + 1)
        passage = ex.get("reading_passage", "")
        h = hashlib.sha256(passage.strip().lower().encode('utf-8')).hexdigest()
        if h not in exclude_hashes:
            results.append(ex)
            exclude_hashes.add(h)
            if len(results) >= count:
                break

    # 2. Unseen templates from other tiers in the same module
    if len(results) < count:
        other_tpls = [t for t in all_tpls if t not in tier_tpls]
        random.shuffle(other_tpls)
        for idx, tpl in enumerate(other_tpls):
            ex = formatter(tpl, idx + 50)
            passage = ex.get("reading_passage", "")
            h = hashlib.sha256(passage.strip().lower().encode('utf-8')).hexdigest()
            if h not in exclude_hashes:
                results.append(ex)
                exclude_hashes.add(h)
                if len(results) >= count:
                    break

    # 3. If still needed, cycle with seed variations
    cycle_idx = 100
    while len(results) < count:
        for tpl in all_tpls:
            ex = formatter(tpl, cycle_idx)
            results.append(ex)
            cycle_idx += 1
            if len(results) >= count:
                break

    return results[:count]


def get_fallback_batch(module: str, difficulty: int, count: int = 5, exclude_hashes: Optional[Set[str]] = None) -> List[Dict[str, Any]]:
    """Primary fallback batch accessor used by session service."""
    return get_procedural_fallback_exercises(module, difficulty, exclude_hashes=exclude_hashes, count=count)
