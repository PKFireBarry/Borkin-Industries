export interface ScreeningQuestion {
  id: string
  prompt: string
  expectedFocus: string
}

// Stable ids ('q1'..'q28') so answers stay tied to the right question even if
// this list is ever reordered or edited. Do not reuse or reorder existing ids.
export const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: 'q1',
    prompt: 'A deep-chested dog is pacing, drooling, and repeatedly retching without producing anything. What do you suspect, and what do you do?',
    expectedFocus: 'GDV/bloat; immediately contact the owner and veterinarian and transport the dog to an emergency clinic.',
  },
  {
    id: 'q2',
    prompt: 'An indoor male cat has not eaten for 24 hours, is hiding, and cries in the litter box. What is the chief concern?',
    expectedFocus: 'Urinary blockage/feline urethral obstruction; treat it as an immediate emergency.',
  },
  {
    id: 'q3',
    prompt: 'How would you safely prepare and administer 1.5 units of Vetsulin twice daily?',
    expectedFocus: 'Shake Vetsulin, use a U-40 syringe, and confirm the dog has eaten to avoid hypoglycemia.',
  },
  {
    id: 'q4',
    prompt: 'What side effects do you monitor in a senior dog taking high-dose NSAIDs such as Carprofen or Galliprant?',
    expectedFocus: 'Vomiting, diarrhea, dark/tarry stools, bleeding, and lethargy; notify the veterinarian.',
  },
  {
    id: 'q5',
    prompt: "A client's dog suffers a bleeding skin tear during a walk. How do you handle it?",
    expectedFocus: 'Apply clean direct pressure, avoid unapproved ointments or peroxide, document the other dog, and follow rabies/incident protocol.',
  },
  {
    id: 'q6',
    prompt: 'A brachycephalic dog overheats during a Florida walk. What are your immediate steps?',
    expectedFocus: 'Shade or air conditioning, gradual cooling with lukewarm/cool water, and veterinary care if it does not improve.',
  },
  {
    id: 'q7',
    prompt: "The pet's name does not match the name on the prescription bottle. How do you proceed?",
    expectedFocus: 'Never administer medication intended for another animal; contact the owner and veterinarian.',
  },
  {
    id: 'q8',
    prompt: 'A Labrador eats raisins and a xylitol-sweetened muffin. Which ingredient is the immediate crisis and why?',
    expectedFocus: 'Xylitol causes rapid, life-threatening hypoglycemia; seek emergency help immediately.',
  },
  {
    id: 'q9',
    prompt: 'A 10-pound Chihuahua may have eaten 85% dark chocolate. How do you determine whether the dose is lethal?',
    expectedFocus: 'Use a veterinary toxicity calculator or contact ASPCA Animal Poison Control immediately.',
  },
  {
    id: 'q10',
    prompt: 'Why can a small amount of ibuprofen or acetaminophen be uniquely dangerous to a cat?',
    expectedFocus: 'Cats cannot safely process these drugs; acetaminophen can cause methemoglobinemia and the situation is an emergency.',
  },
  {
    id: 'q11',
    prompt: 'A dog is accidentally double-dosed with an ACE inhibitor or beta-blocker. What signs do you monitor?',
    expectedFocus: 'Hypotension, bradycardia, lethargy, weakness, staggering, and pale or muddy mucous membranes.',
  },
  {
    id: 'q12',
    prompt: 'A dog licks a dead, bumpy-skinned toad and begins foaming. What do you suspect and what is the first-aid step?',
    expectedFocus: 'Cane toad toxicity; rinse the mouth from back to front with the nose pointed downward and seek emergency care.',
  },
  {
    id: 'q13',
    prompt: 'A cat has lily pollen on its nose but appears normal. Do you wait or go to the ER?',
    expectedFocus: 'Go straight to the ER because all parts of true lilies can cause acute kidney failure.',
  },
  {
    id: 'q14',
    prompt: 'Should you give a dog hydrogen peroxide after it eats something toxic?',
    expectedFocus: 'Only with explicit veterinarian or Poison Control direction; peroxide can worsen some poisonings.',
  },
  {
    id: 'q15',
    prompt: 'A rabbit has stopped eating hay and has no fecal pellets. What is happening and how quickly must you act?',
    expectedFocus: 'GI stasis; immediate veterinary care is needed because it can become fatal within 12-24 hours.',
  },
  {
    id: 'q16',
    prompt: 'Why is feeding rabbit pellets to a guinea pig dangerous?',
    expectedFocus: 'Guinea pigs require dietary vitamin C; use guinea-pig-specific food or appropriate vitamin-C-rich vegetables.',
  },
  {
    id: 'q17',
    prompt: "A bearded dragon's heat/UVB bulb is burned out. Can replacement wait three days?",
    expectedFocus: 'No; restore heat and UVB the same day because reptiles depend on external heat for digestion and health.',
  },
  {
    id: 'q18',
    prompt: 'A red-eared slider is floating sideways and has bubbles from its nose. What is the primary suspicion?',
    expectedFocus: 'Respiratory infection or pneumonia requiring veterinary treatment.',
  },
  {
    id: 'q19',
    prompt: 'A cockatiel is sitting on the cage floor, puffed up, and half-closing its eyes. How urgent is this?',
    expectedFocus: 'Urgent veterinary evaluation.',
  },
  {
    id: 'q20',
    prompt: 'What cookware should be avoided around birds?',
    expectedFocus: 'Non-stick/Teflon cookware because overheated PTFE can release fatal fumes.',
  },
  {
    id: 'q21',
    prompt: 'A horse is repeatedly rolling, pawing, and biting its flanks. What is the concern and first step?',
    expectedFocus: 'Colic; call the owner/equine veterinarian and keep the horse walking slowly while following veterinary instructions.',
  },
  {
    id: 'q22',
    prompt: 'A pig is overheated after its mud hole dries up. Can you use ice-cold water?',
    expectedFocus: 'No; cool gradually with tepid/lukewarm water, shade, and airflow.',
  },
  {
    id: 'q23',
    prompt: 'How do you administer SQ fluids to a fractious cat, and what do you do if it jumps away?',
    expectedFocus: 'Check the bag, use a fresh needle, tent the skin, use low-stress handling, close the roller clamp, check for injury, and never reinsert a contaminated needle.',
  },
  {
    id: 'q24',
    prompt: 'A client asks you to diagnose a red, gooey eye and approve leftover drops. How do you legally respond?',
    expectedFocus: 'Do not diagnose or approve medication; advise prompt veterinary care because the wrong drops can cause serious harm.',
  },
  {
    id: 'q25',
    prompt: 'What are your responsibilities when handling Phenobarbital, Gabapentin, or Tramadol compared with supplements?',
    expectedFocus: 'Secure and count medication, document each dose, and protect it from misuse or theft.',
  },
  {
    id: 'q26',
    prompt: 'You find clear signs of animal neglect or abuse during a visit. What is your legal and ethical obligation?',
    expectedFocus: 'Document objectively, follow applicable mandated-reporting requirements, contact authorities/animal control, and notify Borkin Industries.',
  },
  {
    id: 'q27',
    prompt: 'A dog is prescribed both an NSAID and Prednisone. What is the red flag?',
    expectedFocus: 'Do not give both concurrently; contact the veterinarian because of severe GI and kidney risks and possible washout requirements.',
  },
  {
    id: 'q28',
    prompt: 'A dog develops severe watery diarrhea on day three of a high-dose antibiotic course. Do you stop the antibiotic immediately?',
    expectedFocus: 'Do not stop it independently; contact the veterinarian for instructions and assess the dog’s condition.',
  },
]
