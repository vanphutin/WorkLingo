import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { RevisionSelector } from './revision-selector';
import { LocaleProvider } from '../../i18n/provider';
import type { ProgramCurriculumBinding } from '@worklingo/contracts';
afterEach(cleanup);
const binding=(title:string,id:string)=>({curriculumRevisionId:id,pathId:'p',levelId:'l',missionId:'m',pathTitle:'Stage one',levelTitle:'Unit one',order:1,title,objectives:['Understand requests'],required:true,prerequisiteRevisionIds:[],lessons:[]} as ProgramCurriculumBinding);
it('adds exact human titled references and moves ordered selected revisions',()=>{
 const a=binding('Requests','a'), b=binding('Replies','b');const change=vi.fn();
 const {rerender}=render(<RevisionSelector options={[a,b]} value={[a]} onChange={change}/>);
 fireEvent.click(screen.getByRole('button',{name:'Add Replies'}));
 expect(change).toHaveBeenLastCalledWith([expect.objectContaining({curriculumRevisionId:'a',order:1}),expect.objectContaining({curriculumRevisionId:'b',order:2})]);
 rerender(<RevisionSelector options={[a,b]} value={[a,b]} onChange={change}/>);
 fireEvent.click(screen.getByRole('button',{name:'Move up Replies'}));
 expect(change).toHaveBeenLastCalledWith([expect.objectContaining({curriculumRevisionId:'b',order:1}),expect.objectContaining({curriculumRevisionId:'a',order:2})]);
 expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('translates author controls while retaining authored copy',()=>{
 render(<LocaleProvider initialLocale="vi"><RevisionSelector options={[binding('Requests','a')]} value={[]} onChange={vi.fn()}/></LocaleProvider>);
 expect(screen.getByRole('heading',{name:'Bản chương trình đã xuất bản'})).toBeInTheDocument();
 expect(screen.getByRole('button',{name:'Thêm Requests'})).toBeInTheDocument();
});
