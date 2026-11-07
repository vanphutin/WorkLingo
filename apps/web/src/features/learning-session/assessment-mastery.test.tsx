import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,it,expect,vi} from 'vitest';
import {AssessmentMastery} from './assessment-mastery';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('separates four skills and shows unobserved evidence without a numeric mastery claim',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({skills:['reading','listening','speaking','writing'].map(skill=>({skill,observations:0,score:null,confidence:'UNKNOWN',gaps:['Need more evidence'],recommendation:'Practice again'})),disclosure:'No CEFR mastery claim.'}))));
 render(<AssessmentMastery/>);
 expect(await screen.findByText('No CEFR mastery claim.')).toBeInTheDocument();
 expect(screen.getAllByText('Not scored')).toHaveLength(4);
 for(const name of ['Reading','Listening','Speaking','Writing'])expect(screen.getByRole('heading',{name})).toBeInTheDocument();
});
