import '@testing-library/jest-dom/vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,it,expect,vi } from 'vitest';
import { AssessmentAdminWorkspace } from './assessment-admin-workspace';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('requires an attempt UUID before loading authorized admin history',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({items:[],audit:[{action:'requested'}]}))));
 render(<AssessmentAdminWorkspace/>);
 fireEvent.change(screen.getByLabelText('Attempt ID'),{target:{value:'bad'}});
 fireEvent.click(screen.getByRole('button',{name:'Load history'}));
 expect(screen.getByRole('alert')).toHaveTextContent('valid attempt UUID');
 fireEvent.change(screen.getByLabelText('Attempt ID'),{target:{value:'00000000-0000-4000-8000-000000000001'}});
 fireEvent.click(screen.getByRole('button',{name:'Load history'}));
 expect(await screen.findByText(/requested/)).toBeInTheDocument();
});
