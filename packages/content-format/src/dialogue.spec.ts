import { describe, expect, it } from 'vitest';
import * as format from './index.ts';

describe('parseDialogue', () => {
  it('exports legacy turns with stable speaker IDs without guessing gender', () => {
    expect(format.parseDialogue('An: Hello, Lan.\nLan: Hi, An!\nAn: Shall we start?')).toEqual({
      isDialogue: true,
      speakers: [
        { id: 'an', name: 'An', gender: null },
        { id: 'lan', name: 'Lan', gender: null },
      ],
      turns: [
        { speaker: 'an', text: 'Hello, Lan.' },
        { speaker: 'lan', text: 'Hi, An!' },
        { speaker: 'an', text: 'Shall we start?' },
      ],
      issues: [],
    });
  });

  it.each([
    ['nam', 'male'], ['NAM', 'male'], ['male', 'male'],
    ['nữ', 'female'], ['NỮ', 'female'], ['nu\u031b\u0303', 'female'], ['FEMALE', 'female'],
  ])('normalizes declaration (%s) and applies it to later bare turns', (annotation, gender) => {
    const result = format.parseDialogue(`  Lê   An (${annotation}): Hello.\nlê an: Again.`);
    expect(result.speakers).toEqual([{ id: 'lê an', name: 'Lê An', gender }]);
    expect(result.turns).toEqual([
      { speaker: 'lê an', text: 'Hello.' },
      { speaker: 'lê an', text: 'Again.' },
    ]);
    expect(result.issues).toEqual([]);
  });

  it('detects one explicitly annotated speaker', () => {
    expect(format.parseDialogue('Lan ( female ): Hi!')).toEqual({
      isDialogue: true,
      speakers: [{ id: 'lan', name: 'Lan', gender: 'female' }],
      turns: [{ speaker: 'lan', text: 'Hi!' }],
      issues: [],
    });
  });

  it('matches canonically equivalent Unicode speaker names', () => {
    const result = format.parseDialogue('Lê (male): First.\nLe\u0302: Second.');
    expect(result.speakers).toEqual([{ id: 'lê', name: 'Lê', gender: 'male' }]);
    expect(result.turns.map((turn) => turn.speaker)).toEqual(['lê', 'lê']);
  });

  it.each([
    '', '   ', 'An: Hello.', 'Note: Please arrive at 9:30.',
    'Note: Bring a laptop.\nReminder: Be on time.',
    'https://example.com\nhttp://example.org', '09:30 meeting\n10:00 break',
    'The reason is: we need more time.\nThe next step is: review.',
  ])('keeps ordinary narration intact: %j', (text) => {
    expect(format.parseDialogue(text)).toEqual({
      isDialogue: false, speakers: [], issues: [],
      turns: text ? [{ speaker: null, text }] : [],
    });
  });

  it('allows a known dialogue context to force a single bare label', () => {
    expect(format.parseDialogue('An: Hello.', { forceDialogue: true })).toEqual({
      isDialogue: true,
      speakers: [{ id: 'an', name: 'An', gender: null }],
      turns: [{ speaker: 'an', text: 'Hello.' }], issues: [],
    });
  });

  it('preserves multiline continuations, blank lines and punctuation within a turn', () => {
    const result = format.parseDialogue('An: Hello, Lan!\r\n  Here is the plan: start at 9:30.\r\n\r\nThen review.\r\nLan: Yes: let’s go.');
    expect(result.turns).toEqual([
      { speaker: 'an', text: 'Hello, Lan!\nHere is the plan: start at 9:30.\n\nThen review.' },
      { speaker: 'lan', text: 'Yes: let’s go.' },
    ]);
    expect(result.issues).toEqual([]);
  });

  it('preserves narration before and between speakers without assigning it to a character', () => {
    const result = format.parseDialogue('The team enters.\nAn (male): Hello!\n[The door closes.]\nLan (female): Hi!\nNarrator: They leave.');
    expect(result.turns).toEqual([
      { speaker: null, text: 'The team enters.' },
      { speaker: 'an', text: 'Hello!' },
      { speaker: null, text: '[The door closes.]' },
      { speaker: 'lan', text: 'Hi!' },
      { speaker: null, text: 'Narrator: They leave.' },
    ]);
    expect(result.speakers.map((speaker) => speaker.id)).toEqual(['an', 'lan']);
  });

  it.each(['', 'unknown', 'woman', 'male/female'])('rejects unsupported or empty gender (%s)', (gender) => {
    const result = format.parseDialogue(`An (${gender}): Hello.`);
    expect(result.isDialogue).toBe(true);
    expect(result.speakers).toEqual([{ id: 'an', name: 'An', gender: null }]);
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_INVALID_GENDER' })]);
    expect(result.turns).toEqual([{ speaker: 'an', text: 'Hello.' }]);
  });

  it('rejects conflicting annotations without replacing the first gender', () => {
    const result = format.parseDialogue('An (nam): First.\nAN (female): Second.');
    expect(result.speakers).toEqual([{ id: 'an', name: 'An', gender: 'male' }]);
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_CONFLICTING_GENDER' })]);
  });

  it('requires gender for every character when there are more than two', () => {
    const result = format.parseDialogue('An (male): First.\nLan: Second.\nMinh: Third.\nAn: Fourth.');
    expect(result.issues).toEqual([
      { code: 'DIALOGUE_MISSING_GENDER', message: expect.stringContaining('Lan') },
      { code: 'DIALOGUE_MISSING_GENDER', message: expect.stringContaining('Minh') },
    ]);
  });

  it('accepts three explicitly gendered characters and equivalent repeated declarations', () => {
    const result = format.parseDialogue('An (nam): First.\nLan (nữ): Second.\nMinh (male): Third.\nAn (MALE): Fourth.');
    expect(result.speakers.map((speaker) => speaker.gender)).toEqual(['male', 'female', 'male']);
    expect(result.issues).toEqual([]);
  });

  it.each([
    ': Hello.', '(male): Hello.', 'An (male: Hello.', 'An male): Hello.',
    'An (male) (female): Hello.', 'An!: Hello.', 'An (male) Hello.',
  ])('reports malformed headings and retains their text: %s', (heading) => {
    const result = format.parseDialogue(`Lan (female): Hi.\n${heading}`);
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_INVALID_LABEL' })]);
    expect(result.turns).toEqual([
      { speaker: 'lan', text: 'Hi.' },
      { speaker: null, text: heading },
    ]);
  });

  it('rejects a turn with no utterance, but accepts a heading with a continuation', () => {
    expect(format.parseDialogue('An (male):\nLan (female): Hi.').issues).toEqual([
      expect.objectContaining({ code: 'DIALOGUE_EMPTY_TURN' }),
    ]);
    expect(format.parseDialogue('An (male):\nHello.').turns).toEqual([{ speaker: 'an', text: 'Hello.' }]);
    expect(format.parseDialogue('An (male):\nHello.').issues).toEqual([]);
  });

  it('accepts whitespace around annotation delimiters and tab-separated names', () => {
    const result = format.parseDialogue('  Lê\tAn ( NAM ) : Hello.\nlê an: Again.');
    expect(result.speakers).toEqual([{ id: 'lê an', name: 'Lê An', gender: 'male' }]);
    expect(result.turns).toEqual([
      { speaker: 'lê an', text: 'Hello.' }, { speaker: 'lê an', text: 'Again.' },
    ]);
    expect(result.issues).toEqual([]);
  });

  it.each(['An (male):: Hello.', 'An (male)： Hello.', '@An: Hello.', '123: Hello.'])('rejects ambiguous label delimiters: %s', (heading) => {
    const result = format.parseDialogue(`Lan (female): Hi.\n${heading}`);
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_INVALID_LABEL' })]);
    expect(result.turns).toEqual([{ speaker: 'lan', text: 'Hi.' }, { speaker: null, text: heading }]);
  });

  it('detects malformed double-colon legacy dialogue before speech', () => {
    const result = format.parseDialogue('An:: Hello.\nLan: Hi.');
    expect(result.isDialogue).toBe(true);
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_INVALID_LABEL' })]);
  });

  it('retains standalone parenthetical narration without mistaking it for a malformed label', () => {
    const result = format.parseDialogue('An (male): Hello.\n(The visitor enters.)\nLan (female): Welcome.');
    expect(result.issues).toEqual([]);
    expect(result.turns).toEqual([
      { speaker: 'an', text: 'Hello.' },
      { speaker: null, text: '(The visitor enters.)' },
      { speaker: 'lan', text: 'Welcome.' },
    ]);
  });

  it('recognizes explicitly declared long names and their later bare-name turns', () => {
    const result = format.parseDialogue('Nguyễn Thị Thanh Hương Trang (nữ): Hello.\nNguyễn Thị Thanh Hương Trang: Again.');
    expect(result.speakers).toEqual([{ id: 'nguyễn thị thanh hương trang', name: 'Nguyễn Thị Thanh Hương Trang', gender: 'female' }]);
    expect(result.turns).toEqual([
      { speaker: 'nguyễn thị thanh hương trang', text: 'Hello.' },
      { speaker: 'nguyễn thị thanh hương trang', text: 'Again.' },
    ]);
    expect(result.issues).toEqual([]);
  });

  it.each(['An:: Hello.', '@An: Hello.\n@Lan: Hi.'])('reports clearly malformed labels even without enough valid labels: %s', (text) => {
    const result = format.parseDialogue(text);
    expect(result.isDialogue).toBe(true);
    expect(result.issues[0]?.code).toBe('DIALOGUE_INVALID_LABEL');
    expect(result.turns.map((turn) => turn.text).join('\n')).toBe(text);
  });

  it('keeps ordinary parenthesized sentences as speaker continuations', () => {
    const result = format.parseDialogue('An (male): Hello.\nI (really) appreciate your help.\nI (also) think this: we should go.\nLan (female): Thanks.');
    expect(result.issues).toEqual([]);
    expect(result.turns).toEqual([
      { speaker: 'an', text: 'Hello.\nI (really) appreciate your help.\nI (also) think this: we should go.' },
      { speaker: 'lan', text: 'Thanks.' },
    ]);
  });

  it('diagnoses malformed declarations using established case-normalized names', () => {
    const result = format.parseDialogue('Lê An (male): First.\nlê an (male: Second.');
    expect(result.issues).toEqual([expect.objectContaining({ code: 'DIALOGUE_INVALID_LABEL' })]);
    expect(result.turns).toEqual([
      { speaker: 'lê an', text: 'First.' }, { speaker: null, text: 'lê an (male: Second.' },
    ]);
  });

  it('preserves narrator ownership with whitespace before its colon', () => {
    const result = format.parseDialogue('An (male): First.\nNarrator : The visitor enters.\nLan (female): Second.');
    expect(result.issues).toEqual([]);
    expect(result.turns).toEqual([
      { speaker: 'an', text: 'First.' },
      { speaker: null, text: 'Narrator : The visitor enters.' },
      { speaker: 'lan', text: 'Second.' },
    ]);
  });
});
