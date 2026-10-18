export type EvidenceItem = readonly [prompt: string, answer: string, evidence: string, alternatives?: readonly (readonly [answer: string, evidence: string])[]];
export interface ListeningScript { title: string; turns: { voice: string; text: string }[]; items: EvidenceItem[] }
const david = 'Microsoft David'; const zira = 'Microsoft Zira'; const mark = 'Microsoft Mark';

/** Entirely original fictional situations. Evidence is private authoring material, never learner content. */
export const listening: ListeningScript[] = [
  {
    title: 'Joining a community repair workshop',
    turns: [
      { voice: david, text: 'Good morning, Riverside Community Centre. You are speaking to Daniel. How can I help you today?' },
      { voice: zira, text: 'Hello. I saw a notice about learning to repair household objects. My lamp has stopped working, and I would rather understand the problem than immediately buy another one. Is your workshop suitable for someone without electrical training?' },
      { voice: david, text: 'Yes, our introductory workshop is for beginners. The first session covers safe inspection; nobody works on a plugged-in appliance. The next course begins on Saturday. The older leaflet says Sunday, but that was the date of our demonstration, not the course. We open the building at nine, although teaching starts at ten. Please arrive a little early so we can check your object before the group begins.' },
      { voice: zira, text: 'Saturday works for me. My neighbour is interested too, but she can only attend later sessions. How long does the course run, and where should we go when we arrive? The centre seemed quite large when I visited last year.' },
      { voice: david, text: 'There are four weekly meetings. We use the garden room, which is on the ground floor. Do not go upstairs to the art studio. Follow the corridor past reception and turn towards the courtyard. The garden room has a separate entrance from that courtyard, so you can avoid carrying a heavy object through the main hall.' },
      { voice: zira, text: 'That sounds straightforward. I can carry the lamp myself. What does the course cost? I saw two different prices online, and I was not sure whether one price included materials.' },
      { voice: david, text: 'The fee is thirty pounds for all four meetings. Twenty pounds was a subsidised price last winter; that offer has ended. Small replacement parts are included, but an expensive component would need a separate discussion. We never order anything without your agreement. You should bring a notebook to record what you learn. We provide tools, gloves and safety glasses, so please leave your own toolkit at home.' },
      { voice: zira, text: 'I will bring a notebook. Do I need to send a photograph of the lamp beforehand? I do not have the original instructions, and the label underneath is difficult to read.' },
      { voice: david, text: 'A photograph is optional. For your first visit, bring some identification so we can confirm your registration. You can show a driving licence or a library card. You do not need the original receipt for your lamp. If you come by bus, get off at the library stop. The station stop is farther away and involves crossing the main road.' },
      { voice: zira, text: 'I know the library stop. One last thing: my daughter is fourteen and would like to watch. Would that be allowed?' },
      { voice: david, text: 'Certainly. Children under sixteen must be accompanied by an adult throughout the session. Finally, bookings close on Wednesday. That gives our volunteers time to prepare suitable examples. Please use the website rather than sending cash. After booking, you will receive a confirmation by email. If it does not arrive, telephone reception and we will check the booking together.' },
    ],
    items: [
      ['On which day does the new course begin?', 'Saturday', 'The next course begins on Saturday.'],
      ['At what hour does teaching start? Write the word.', 'ten', 'teaching starts at ten.'],
      ['How many weekly meetings are included? Write the word.', 'four', 'There are four weekly meetings.'],
      ['Which room is used for the workshop?', 'garden room', 'We use the garden room'],
      ['What is the course fee in pounds? Write the number in words.', 'thirty', 'The fee is thirty pounds'],
      ['What should participants bring to record their learning?', 'notebook', 'bring a notebook', [['a notebook', 'bring a notebook']]],
      ['What general category of document must a participant bring to confirm registration? Give the category, not a specific example.', 'identification', 'bring some identification'],
      ['Which bus stop is recommended?', 'library', 'the library stop', [['library stop', 'the library stop']]],
      ['Who must accompany children under sixteen?', 'adult', 'accompanied by an adult', [['an adult', 'accompanied by an adult']]],
      ['On which day do bookings close?', 'Wednesday', 'bookings close on Wednesday.'],
    ],
  },
  {
    title: 'An introduction to a wetland reserve',
    turns: [{ voice: mark, text: `Welcome to Willow Marsh. I am the volunteer coordinator, and I will explain how to enjoy the reserve without disturbing its wildlife. Before we begin, a correction to the printed map: the north gate is closed for repairs. All visitors should enter through the east gate. You can still walk the complete circular route once inside, so there is no need to shorten your visit. Our team is replacing the damaged bridge near the old entrance, and vehicles need access to that area throughout the week.

      The visitor centre opens at nine each morning. In winter, closing time is four; during summer we stay open later. We keep the paths open after the centre closes, but the toilets and exhibition room will be locked. The exhibition explains why this site was restored. Twenty years ago much of the land was used for grazing, and the channels were kept unusually dry. Restoring the natural water levels has encouraged a greater variety of birds and insects to return.

      If you want to see birds without being easily noticed, use the wooden hide beside the southern pool. Please approach it quietly and close the door gently. Binoculars are available from reception; you may borrow a pair at no charge. We ask you to leave a name with the volunteers so we can make sure every pair is returned. The equipment is intended for use on the reserve, rather than for taking home overnight.

      The shorter walking route follows the boardwalk. This raised wooden surface allows wheelchairs to cross the wet ground. After heavy rain, some of the earth paths become muddy, but the boardwalk usually remains accessible. If you are unsure about conditions, ask before setting off. Dogs are welcome on the outer route only, and must be kept on a lead. They cannot enter the hide or the nesting area, even when they are quiet and accustomed to birds.

      Please put food wrappers in the bins beside the car park. There are no bins along the trail because collecting waste there would require frequent vehicle journeys across sensitive ground. Take water with you and carry your rubbish back. You may photograph the landscape and wildlife, but drones are prohibited. Their noise can cause birds to leave their nests, particularly during the breeding season.

      Our regular guided walk takes place on Friday. It is a gentle walk with frequent stops, and it is suitable for people who have never visited a wetland before. You do not have to recognise any species in advance. Volunteers explain what they notice and help everyone use the equipment. Finally, if you would like to join the next habitat survey, register at reception. You will receive a short training session before collecting observations. We need careful notes from ordinary visitors as well as experienced naturalists, so please ask if you are interested.` }],
    items: [
      ['Which gate should visitors use?', 'east', 'enter through the east gate.', [['east gate', 'enter through the east gate.']]],
      ['At what hour does the visitor centre close in winter? Write the word.', 'four', 'closing time is four'],
      ['What was much of the land used for twenty years ago?', 'grazing', 'used for grazing'],
      ['Which structure allows visitors to observe birds discreetly?', 'wooden hide', 'use the wooden hide', [['hide', 'use the wooden hide']]],
      ['What equipment can visitors borrow from reception?', 'Binoculars', 'Binoculars are available from reception'],
      ['Which route surface is suitable for wheelchairs?', 'boardwalk', 'the boardwalk. This raised wooden surface allows wheelchairs'],
      ['Where are the rubbish bins? Give the two-word location.', 'car park', 'bins beside the car park.'],
      ['Which flying devices are prohibited?', 'drones', 'drones are prohibited.'],
      ['On which day does the regular guided walk take place?', 'Friday', 'guided walk takes place on Friday.'],
      ['Where should visitors register for the habitat survey?', 'reception', 'register at reception.', [['at reception', 'register at reception.']]],
    ],
  },
  {
    title: 'Planning a university transport study',
    turns: [
      { voice: zira, text: 'We need to settle the design of our transport study before the tutor meeting. We originally proposed interviewing everyone at the main station, but I am worried that would exclude students who never use trains.' },
      { voice: david, text: 'I agree. Let us collect responses in the cafeteria instead. Students from several departments eat there, and we can approach people at different times. It still will not be a perfect sample, but it should represent more travel habits than the station would. We should record the time of each interview so we can see whether the groups differ.' },
      { voice: zira, text: 'Good idea. We also need a manageable sample size. I suggested two hundred interviews, but that is unrealistic alongside our other assignments. Our target will be sixty responses. That should give us enough examples to practise analysing patterns, although we must be cautious about generalising to the whole university.' },
      { voice: david, text: 'What about asking for names so we can contact participants later?' },
      { voice: zira, text: 'I would avoid that. We should keep responses anonymous. We are studying journeys rather than individual students, and we do not need identifying information. The questionnaire should ask for their main transport mode first. That will let people describe what they normally use before we ask them to explain particular difficulties.' },
      { voice: david, text: 'Then we should ask about cost. Distance seems obvious, but we already collect the approximate journey length. Cost may explain why two students living in the same neighbourhood choose different routes. We should state whether we mean a single journey or a whole week, otherwise their numbers will not be comparable.' },
      { voice: zira, text: 'Let us use weekly spending. I also want a small pilot before the main collection. We can test the questions on Monday, with volunteers from our seminar. They should tell us which instructions are confusing. We will use their comments to revise the questionnaire, but exclude the pilot responses from the final dataset.' },
      { voice: david, text: 'We can enter the main responses into a spreadsheet. We do not need specialised software for this assignment. A bar chart should show the transport categories clearly. A line chart would suggest a time sequence, which is not what our categories represent.' },
      { voice: zira, text: 'Exactly. For the report, we should discuss a limitation rather than only presenting the chart. Students absent from campus are excluded, so the sample may underrepresent people with particularly difficult commutes. We also need to distinguish what participants report from what we have independently measured.' },
      { voice: david, text: 'And the tutor asked for a practical recommendation. We could recommend more bicycle storage if the responses show a need, but we must not decide the outcome in advance. Let us send the revised questionnaire to the tutor on Thursday. That leaves time for feedback before we collect the main responses next week. I will write the sampling explanation, and you can prepare the consent statement. Then we can check the wording together.' },
    ],
    items: [
      ['Where will the main responses be collected?', 'cafeteria', 'in the cafeteria instead.', [['the cafeteria', 'in the cafeteria instead.']]],
      ['How many responses are targeted? Write the word.', 'sixty', 'target will be sixty responses.'],
      ['How will responses be kept to avoid identifying participants?', 'anonymous', 'keep responses anonymous.'],
      ['What should the questionnaire ask about first?', 'transport mode', 'main transport mode first.'],
      ['Which additional factor may explain different route choices?', 'cost', 'ask about cost.'],
      ['On which day will the pilot take place?', 'Monday', 'test the questions on Monday'],
      ['Into what will the main responses be entered?', 'spreadsheet', 'into a spreadsheet.', [['a spreadsheet', 'into a spreadsheet.']]],
      ['What kind of chart will show the categories?', 'bar chart', 'A bar chart should show the transport categories'],
      ['Students absent from which place are excluded?', 'campus', 'Students absent from campus are excluded'],
      ['On which day will the revised questionnaire be sent?', 'Thursday', 'to the tutor on Thursday.'],
    ],
  },
  {
    title: 'Understanding heat in city streets',
    turns: [{ voice: david, text: `Today we will consider why two streets in the same city can feel very different during a hot afternoon. Our example is a fictional research project in a district called Bellford. The researchers compared ordinary residential streets, rather than unusual places such as industrial yards. They wanted to understand conditions experienced during everyday walking, especially by people travelling to shops or bus stops.

      The team installed temperature sensors at pedestrian height. Rooftop instruments would have been easier to protect, but would not necessarily describe the air that people encountered. Each sensor was shielded from direct sunlight, because otherwise the instrument itself could become hotter than the surrounding air. Measurements were collected in July, when the district typically experienced its longest spell of hot weather. Researchers checked the instruments before and after the study to identify possible drift.

      They found that shade was strongly associated with lower afternoon temperatures along the walking routes. This did not mean that every shaded location behaved identically. The width of the street, the materials of nearby walls and the direction of the wind also mattered. In particular, dark asphalt absorbed energy during the day and released it later. The researchers therefore warned against explaining a whole street with just one feature visible in a photograph.

      Trees can help in two ways. Their leaves block some incoming radiation, and water leaving the leaves contributes to cooling. This second process is called transpiration. However, a recently planted tree cannot immediately provide the benefits of a mature canopy. It needs suitable soil, enough space and continuing care. In the project, the strongest constraint on planting plans was the presence of underground cables. A promising empty strip on a map was sometimes unavailable once engineers inspected the services beneath it.

      To test a smaller intervention, residents installed temporary shade at selected bus stops. The comparison stops received no additional shade during the same period. Participants then recorded how comfortable they felt while waiting. These comfort ratings were useful, but they were subjective. People differed in their expectations, clothing and previous exposure to heat. The researchers kept the ratings separate from the temperature measurements rather than treating the two forms of evidence as interchangeable.

      One important limitation concerned the night. The project collected detailed observations during daylight hours, so it could not establish whether the same interventions reduced overnight heat. This matters because walls and road surfaces may continue releasing energy after sunset. A future study would need instruments operating across the entire day and repeated observations in different weather conditions.

      The final recommendation was to prioritise routes used by older residents. This was a decision about access and vulnerability, rather than a claim that younger people never experienced discomfort. The researchers also recommended publishing maintenance responsibilities with any planting proposal. A design that looks effective on installation day may offer little lasting benefit if no organisation is responsible for watering, inspection and replacement. The central lesson is to connect a physical intervention with a realistic account of how people use and maintain the street.` }],
    items: [
      ['At what height were sensors installed?', 'pedestrian height', 'at pedestrian height.'],
      ['In which month were measurements collected?', 'July', 'Measurements were collected in July'],
      ['Which feature was associated with lower afternoon temperatures?', 'shade', 'shade was strongly associated with lower afternoon temperatures'],
      ['Which dark road material absorbed energy?', 'asphalt', 'dark asphalt absorbed energy', [['dark asphalt', 'dark asphalt absorbed energy']]],
      ['What is the process of water leaving leaves called?', 'transpiration', 'called transpiration.'],
      ['What underground infrastructure constrained planting?', 'cables', 'underground cables.', [['underground cables', 'underground cables.']]],
      ['At which waiting locations was temporary shade installed?', 'bus stops', 'at selected bus stops.'],
      ['How does the lecturer describe the comfort ratings?', 'subjective', 'they were subjective.'],
      ['Which period was a limitation of the observations?', 'night', 'limitation concerned the night.', [['the night', 'limitation concerned the night.']]],
      ['Which group should have its routes prioritised?', 'older residents', 'routes used by older residents.'],
    ],
  },
];
