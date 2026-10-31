import React from 'react';
import { CurriculumWorkspace } from '../../../../features/admin-curriculum/curriculum-workspace';
export default async function AdminCurriculumPage({searchParams}:{searchParams:Promise<{programId?:string}>}) {
 const {programId}=await searchParams;
 return <CurriculumWorkspace {...(programId?{initialProgramId:programId}:{})}/>;
}
