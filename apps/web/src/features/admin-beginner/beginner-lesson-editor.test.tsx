import '@testing-library/jest-dom/vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {BeginnerLessonEditor} from './beginner-lesson-editor';
afterEach(cleanup);
describe('source-preserving Format1.2 editor',()=>{
 it('keeps unknown and multiline source intact when editing a known instruction',()=>{
  const source='FORMAT: WorkLingoLesson/1.2\n[INSTRUCTION guide]\nphase: readDecode\norder: 0\ntext: Read carefully.\n[/INSTRUCTION]\n[UNRECOGNIZED custom]\nkeep every line\n[/UNRECOGNIZED]\n';
  const change=vi.fn();render(<BeginnerLessonEditor source={source} onSourceChange={change}/>);
  fireEvent.change(screen.getByLabelText('Instruction guide · text'),{target:{value:'Read the new example.'}});
  expect(change).toHaveBeenCalledWith(source.replace('text: Read carefully.','text: Read the new example.'));
  expect(screen.getByLabelText('Lesson source')).toHaveValue(source);
 });
 it('does not call publish when source changes or validation is requested',()=>{
  const publish=vi.fn(),validate=vi.fn();
  render(<BeginnerLessonEditor source="FORMAT: WorkLingoLesson/1.2" onSourceChange={vi.fn()} status="VALIDATED" persisted actions={{validate,publish}}/>);
  expect(screen.getByRole('button',{name:'Publish to test'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Validate'}));expect(validate).toHaveBeenCalledOnce();expect(publish).not.toHaveBeenCalled();
 });
});
