import '@testing-library/jest-dom/vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {afterEach,expect,it,vi} from 'vitest';
import {VocabularyPicker} from './vocabulary-picker';
import {vocabularyLibraryClient} from '../../lib/api/vocabulary-library-client';
import {useState} from 'react';
import type {ProgramCurriculumBinding} from '@worklingo/contracts';
const id='11111111-1111-4111-8111-111111111111';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('queries stored CEFR and attaches actual lexical/sense identifiers with visible permissions',async()=>{
 const entry={id,canonicalForm:'request',cefrAssociations:[{cefrLevel:'A1'}],senses:[{id:'22222222-2222-4222-8222-222222222222',definition:'Ask politely',rightsBasis:'PERMISSION'}]} as never;
 const entries=vi.spyOn(vocabularyLibraryClient,'entries').mockResolvedValue({items:[entry],page:1,total:1,limit:25});
 vi.spyOn(vocabularyLibraryClient,'entry').mockResolvedValue(entry);
 vi.spyOn(vocabularyLibraryClient,'provenance').mockResolvedValue({items:[{sourceEntry:{id,cefrLevel:'A1',document:{source:{title:'Permitted dictionary',permissionReference:'Permission 42',attributionRequirements:'Credit source'}}}}],total:1,page:1,limit:25} as never);
 const onChange=vi.fn();render(<VocabularyPicker bindings={[{curriculumRevisionId:id,lessons:[{lessonVersionId:id,title:'Requests',vocabularyRefs:[],resourceRefs:[]}]}] as never} onChange={onChange} beginner/>);
 fireEvent.click(screen.getByText('Vocabulary library'));fireEvent.change(screen.getByLabelText('Search vocabulary'),{target:{value:'request'}});fireEvent.click(screen.getByRole('button',{name:'Search vocabulary'}));
 fireEvent.click(await screen.findByRole('button',{name:'Source and permission'}));expect(await screen.findByText(/Permission 42/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Add'}));expect(onChange).toHaveBeenCalledWith([expect.objectContaining({lessons:[expect.objectContaining({vocabularyRefs:[{lexicalEntryId:id,senseId:'22222222-2222-4222-8222-222222222222'}]})]})]);
 await waitFor(()=>expect(entries).toHaveBeenCalledWith(expect.objectContaining({cefr:'A1',search:'request'})));
 expect(screen.queryByRole('option',{name:'B1'})).not.toBeInTheDocument();
});
it('changes only the selected curriculum binding when a lesson version is reused',async()=>{
 const senseId='22222222-2222-4222-8222-222222222222';
 vi.spyOn(vocabularyLibraryClient,'entries').mockResolvedValue({items:[{id,canonicalForm:'request',cefrAssociations:[],senses:[{id:senseId,definition:'Ask politely',rightsBasis:'PERMISSION'}]}] as never,total:1,page:1,limit:25});
 const original=[{curriculumRevisionId:'unit-a',title:'Unit A',lessons:[{lessonVersionId:id,title:'Shared lesson',vocabularyRefs:[{lexicalEntryId:id,senseId}],resourceRefs:[{id:'Resource A',type:'video'}]}]},{curriculumRevisionId:'unit-b',title:'Unit B',lessons:[{lessonVersionId:id,title:'Shared lesson',vocabularyRefs:[],resourceRefs:[]}]}] as unknown as ProgramCurriculumBinding[];
 const changed=vi.fn();function Editor(){const [bindings,setBindings]=useState(original);return <VocabularyPicker bindings={bindings} onChange={value=>{changed(value);setBindings(value);}}/>;}
 render(<Editor/>);fireEvent.click(screen.getByText('Vocabulary library'));
 const second=screen.getByRole('option',{name:'Unit B / Shared lesson'}) as HTMLOptionElement;
 fireEvent.change(screen.getByLabelText('Attach to lesson'),{target:{value:second.value}});
 fireEvent.click(screen.getByRole('button',{name:'Search vocabulary'}));fireEvent.click(await screen.findByRole('button',{name:'Add'}));
 expect(changed).toHaveBeenLastCalledWith([original[0],expect.objectContaining({curriculumRevisionId:'unit-b',lessons:[expect.objectContaining({vocabularyRefs:[{lexicalEntryId:id,senseId}]})]})]);
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));expect(changed.mock.lastCall?.[0][1].lessons[0].vocabularyRefs).toEqual([]);expect(changed.mock.lastCall?.[0][0]).toEqual(original[0]);
 fireEvent.change(screen.getByLabelText('Resource title'),{target:{value:'Resource B'}});fireEvent.change(screen.getByLabelText('Resource type'),{target:{value:'video'}});fireEvent.click(screen.getByRole('button',{name:'Add resource'}));
 expect(changed.mock.lastCall?.[0][0]).toEqual(original[0]);expect(changed.mock.lastCall?.[0][1].lessons[0].resourceRefs).toEqual([{id:'Resource B',type:'video'}]);
 fireEvent.click(screen.getByRole('button',{name:'Remove'}));expect(changed.mock.lastCall?.[0][1].lessons[0].resourceRefs).toEqual([]);expect(changed.mock.lastCall?.[0][0]).toEqual(original[0]);
});
